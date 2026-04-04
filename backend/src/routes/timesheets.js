const express = require("express");
const { pool } = require("../db");
const router = express.Router();
const { streamTimesheetPdf } = require("../lib/pdf");
const { logAction } = require("../audit");

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

async function fetchSheet(id, userId) {
  const result = await pool.query(
    "SELECT * FROM timesheets WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return result.rows[0] ?? null;
}

// Add 7 days to a YYYY-MM-DD string (UTC, no timezone shift)
function addSevenDays(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().substring(0, 10);
}

// List all timesheets for current user
router.get("/", requireAuth, async (req, res) => {
  const result = await pool.query(
    `
    SELECT t.*,
      (SELECT COUNT(*) FROM timesheet_entries e WHERE e.timesheet_id = t.id AND e.is_present = TRUE) AS present_days,
      (SELECT COALESCE(SUM(e.hours), 0) FROM timesheet_entries e WHERE e.timesheet_id = t.id AND e.is_present = TRUE) AS total_hours
    FROM timesheets t
    WHERE t.user_id = $1
    ORDER BY t.week_start DESC
  `,
    [req.user.id],
  );
  res.json(result.rows);
});

// Weekly summary for the authenticated worker (last N weeks)
// MUST be registered before GET /:id to avoid route shadowing
router.get("/weekly-summary", requireAuth, async (req, res) => {
  const weeks = Math.max(1, Math.min(Number(req.query.weeks) || 8, 52));
  const result = await pool.query(
    `
    SELECT
      t.week_start::TEXT,
      COALESCE(SUM(CASE WHEN e.is_present = TRUE THEN e.hours ELSE 0 END), 0) AS total_hours,
      COUNT(CASE WHEN e.is_present = TRUE THEN 1 END) AS present_days
    FROM timesheets t
    LEFT JOIN timesheet_entries e ON e.timesheet_id = t.id
    WHERE t.user_id = $1
      AND t.week_start >= (CURRENT_DATE - ($2 * INTERVAL '1 week'))::DATE
      AND t.status IN ('submitted', 'approved')
    GROUP BY t.week_start
    ORDER BY t.week_start
    `,
    [req.user.id, weeks],
  );
  res.json(result.rows);
});

// Get leave balance for the authenticated worker
// MUST be registered before GET /:id to avoid route shadowing
router.get("/leave-balance", requireAuth, async (req, res) => {
  const year = req.query.year
    ? Number(req.query.year)
    : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    return res.status(400).json({ error: "Invalid year" });

  const balanceResult = await pool.query(
    "SELECT allocated_days FROM leave_balances WHERE user_id = $1 AND year = $2",
    [req.user.id, year],
  );
  const allocated_days = balanceResult.rows[0]?.allocated_days ?? 0;

  const usedResult = await pool.query(
    `SELECT COUNT(*) AS used_days
     FROM timesheet_entries e
     JOIN timesheets t ON t.id = e.timesheet_id
     WHERE t.user_id = $1
       AND e.work_type = 'Leave'
       AND e.is_present = TRUE
       AND EXTRACT(YEAR FROM e.date) = $2
       AND t.status IN ('submitted', 'approved')`,
    [req.user.id, year],
  );
  const used_days = parseInt(usedResult.rows[0].used_days) || 0;

  res.json({
    year,
    allocated_days,
    used_days,
    remaining_days: Math.max(0, allocated_days - used_days),
  });
});

// PDF export for a single timesheet (worker)
// MUST be registered before GET /:id to avoid route shadowing
router.get("/:id/export/pdf", requireAuth, async (req, res) => {
  const sheet = await fetchSheet(req.params.id, req.user.id);
  if (!sheet) return res.status(404).json({ error: "Not found" });

  // Attach worker name for the PDF header
  const userResult = await pool.query("SELECT name FROM users WHERE id = $1", [
    req.user.id,
  ]);
  sheet.worker_name = userResult.rows[0]?.name ?? "";

  const entries = await pool.query(
    "SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY date",
    [sheet.id],
  );
  const thresholdResult = await pool.query(
    "SELECT value FROM app_settings WHERE key = 'overtime_threshold_hours'",
  );
  const threshold = Math.min(
    24,
    Math.max(0, parseFloat(thresholdResult.rows[0]?.value ?? "8") || 8),
  );

  streamTimesheetPdf(res, sheet, entries.rows, threshold);
});

// Get single timesheet with entries (includes overtime per entry)
router.get("/:id", requireAuth, async (req, res) => {
  const sheet = await fetchSheet(req.params.id, req.user.id);
  if (!sheet) return res.status(404).json({ error: "Not found" });

  const thresholdResult = await pool.query(
    "SELECT value FROM app_settings WHERE key = 'overtime_threshold_hours'",
  );
  const threshold = Math.min(
    24,
    Math.max(0, parseFloat(thresholdResult.rows[0]?.value ?? "8") || 8),
  );

  const entries = await pool.query(
    "SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY date",
    [sheet.id],
  );

  const enrichedEntries = entries.rows.map((e) => {
    const hours = e.is_present && e.hours ? parseFloat(e.hours) : 0;
    return { ...e, overtime_hours: Math.max(0, hours - threshold) };
  });

  const total_overtime_hours = enrichedEntries.reduce(
    (s, e) => s + e.overtime_hours,
    0,
  );

  res.json({
    ...sheet,
    overtime_threshold: threshold,
    total_overtime_hours,
    entries: enrichedEntries,
  });
});

// Create new timesheet for a week (pre-fills holiday entries)
router.post("/", requireAuth, async (req, res) => {
  const { week_start } = req.body;
  if (!week_start || !/^\d{4}-\d{2}-\d{2}$/.test(week_start))
    return res.status(400).json({
      error: "week_start is required and must be in YYYY-MM-DD format",
    });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      "INSERT INTO timesheets (user_id, week_start) VALUES ($1, $2) RETURNING *",
      [req.user.id, week_start],
    );
    const sheet = result.rows[0];

    // Create 7 entries (Mon–Sun), pre-filling any public holidays
    const weekDates = await client.query(
      `SELECT d::DATE::TEXT AS date,
              EXISTS(
                SELECT 1 FROM public_holidays ph WHERE ph.date = d::DATE
              ) AS is_holiday
       FROM generate_series($1::DATE, $1::DATE + INTERVAL '6 days', '1 day') AS d`,
      [week_start],
    );

    for (const { date, is_holiday } of weekDates.rows) {
      await client.query(
        `INSERT INTO timesheet_entries (timesheet_id, date, is_present, work_type)
         VALUES ($1, $2, false, $3)
         ON CONFLICT (timesheet_id, date) DO NOTHING`,
        [sheet.id, date, is_holiday ? "Holiday" : null],
      );
    }

    await client.query("COMMIT");
    res.status(201).json(sheet);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "Timesheet for this week already exists" });
    throw err;
  } finally {
    client.release();
  }
});

// Save/update entries (array of day objects)
router.put("/:id/entries", requireAuth, async (req, res) => {
  const sheet = await fetchSheet(req.params.id, req.user.id);
  if (!sheet) return res.status(404).json({ error: "Not found" });
  if (sheet.status !== "draft")
    return res
      .status(400)
      .json({ error: "Only draft timesheets can be edited" });

  const { entries } = req.body;
  if (!Array.isArray(entries))
    return res.status(400).json({ error: "entries must be an array" });
  if (entries.length > 7)
    return res.status(400).json({ error: "entries must have at most 7 items" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of entries) {
      await client.query(
        `
        INSERT INTO timesheet_entries (timesheet_id, date, is_present, hours, work_type, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (timesheet_id, date) DO UPDATE SET
          is_present = EXCLUDED.is_present,
          hours      = EXCLUDED.hours,
          work_type  = EXCLUDED.work_type,
          notes      = EXCLUDED.notes
      `,
        [
          sheet.id,
          row.date,
          row.is_present ? true : false,
          row.is_present ? (row.hours ?? null) : null,
          row.work_type ?? null,
          row.notes ?? null,
        ],
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// Recall a submitted or rejected timesheet back to draft
router.post("/:id/recall", requireAuth, async (req, res) => {
  const sheet = await fetchSheet(req.params.id, req.user.id);
  if (!sheet) return res.status(404).json({ error: "Not found" });
  if (!["submitted", "rejected"].includes(sheet.status))
    return res
      .status(400)
      .json({ error: "Only submitted or rejected timesheets can be recalled" });

  const recallClient = await pool.connect();
  try {
    await recallClient.query("BEGIN");
    await recallClient.query(
      "UPDATE timesheets SET status = 'draft', submitted_at = NULL WHERE id = $1",
      [sheet.id],
    );
    await logAction(recallClient, {
      actorId: req.user.id,
      actorName: req.user.name,
      action: "recall",
      targetType: "timesheet",
      targetId: sheet.id,
      targetName: `w/c ${sheet.week_start}`,
      metadata: null,
    });
    await recallClient.query("COMMIT");
  } catch (err) {
    await recallClient.query("ROLLBACK");
    throw err;
  } finally {
    recallClient.release();
  }
  res.json({ ok: true });
});

// Copy entries from prior week's timesheet into this draft
router.post("/:id/copy-last-week", requireAuth, async (req, res) => {
  const sheetId = Number(req.params.id);
  if (!Number.isInteger(sheetId) || sheetId <= 0)
    return res.status(400).json({ error: "Invalid timesheet id" });

  const sheet = await fetchSheet(sheetId, req.user.id);
  if (!sheet) return res.status(404).json({ error: "Not found" });
  if (sheet.status !== "draft")
    return res
      .status(409)
      .json({ error: "Cannot copy into a submitted timesheet" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find the previous week's timesheet (inside transaction for snapshot consistency)
    const prevResult = await client.query(
      `SELECT * FROM timesheets
       WHERE user_id = $1 AND week_start = $2::DATE - INTERVAL '7 days'`,
      [req.user.id, sheet.week_start],
    );
    const prevSheet = prevResult.rows[0];
    if (!prevSheet) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "No previous week timesheet found" });
    }

    const prevEntries = await client.query(
      "SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY date",
      [prevSheet.id],
    );
    if (prevEntries.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Previous week has no entries" });
    }

    for (const prev of prevEntries.rows) {
      // Map to current week: previous date + 7 days (no DB round-trip needed)
      const curDate = addSevenDays(
        prev.date instanceof Date
          ? prev.date.toISOString().substring(0, 10)
          : String(prev.date).substring(0, 10),
      );

      // Skip entries the worker has already edited
      const existing = await client.query(
        "SELECT * FROM timesheet_entries WHERE timesheet_id = $1 AND date = $2",
        [sheet.id, curDate],
      );
      const row = existing.rows[0];
      if (row && (row.is_present || row.work_type || row.hours || row.notes))
        continue;

      await client.query(
        `INSERT INTO timesheet_entries (timesheet_id, date, is_present, hours, work_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (timesheet_id, date) DO UPDATE SET
           is_present = EXCLUDED.is_present,
           hours      = EXCLUDED.hours,
           work_type  = EXCLUDED.work_type,
           notes      = EXCLUDED.notes`,
        [
          sheet.id,
          curDate,
          prev.is_present,
          prev.hours ?? null,
          prev.work_type ?? null,
          prev.notes ?? null,
        ],
      );
    }

    await client.query("COMMIT");

    const updatedEntries = await pool.query(
      "SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY date",
      [sheet.id],
    );
    res.json({ ok: true, entries: updatedEntries.rows });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// Submit timesheet for review
router.post("/:id/submit", requireAuth, async (req, res) => {
  const sheet = await fetchSheet(req.params.id, req.user.id);
  if (!sheet) return res.status(404).json({ error: "Not found" });
  if (sheet.status !== "draft")
    return res
      .status(400)
      .json({ error: "Only draft timesheets can be submitted" });

  const submitClient = await pool.connect();
  try {
    await submitClient.query("BEGIN");
    await submitClient.query(
      "UPDATE timesheets SET status = 'submitted', submitted_at = NOW() WHERE id = $1",
      [sheet.id],
    );
    await logAction(submitClient, {
      actorId: req.user.id,
      actorName: req.user.name,
      action: "submit",
      targetType: "timesheet",
      targetId: sheet.id,
      targetName: `w/c ${sheet.week_start}`,
      metadata: null,
    });
    await submitClient.query("COMMIT");
  } catch (err) {
    await submitClient.query("ROLLBACK");
    throw err;
  } finally {
    submitClient.release();
  }
  res.json({ ok: true });
});

module.exports = router;
