const express = require("express");
const { pool } = require("../db");
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  next();
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

// Get single timesheet with entries
router.get("/:id", requireAuth, async (req, res) => {
  const sheetResult = await pool.query(
    "SELECT * FROM timesheets WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id],
  );
  const sheet = sheetResult.rows[0];
  if (!sheet) return res.status(404).json({ error: "Not found" });

  const entries = await pool.query(
    "SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY date",
    [sheet.id],
  );
  res.json({ ...sheet, entries: entries.rows });
});

// Create new timesheet for a week
router.post("/", requireAuth, async (req, res) => {
  const { week_start } = req.body;
  if (!week_start)
    return res.status(400).json({ error: "week_start required" });

  try {
    const result = await pool.query(
      "INSERT INTO timesheets (user_id, week_start) VALUES ($1, $2) RETURNING *",
      [req.user.id, week_start],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "Timesheet for this week already exists" });
    throw err;
  }
});

// Save/update entries (array of day objects)
router.put("/:id/entries", requireAuth, async (req, res) => {
  const sheetResult = await pool.query(
    "SELECT * FROM timesheets WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id],
  );
  const sheet = sheetResult.rows[0];
  if (!sheet) return res.status(404).json({ error: "Not found" });
  if (sheet.status !== "draft")
    return res
      .status(400)
      .json({ error: "Only draft timesheets can be edited" });

  const { entries } = req.body;
  if (!Array.isArray(entries))
    return res.status(400).json({ error: "entries must be an array" });

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
  const sheetResult = await pool.query(
    "SELECT * FROM timesheets WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id],
  );
  const sheet = sheetResult.rows[0];
  if (!sheet) return res.status(404).json({ error: "Not found" });
  if (!["submitted", "rejected"].includes(sheet.status))
    return res
      .status(400)
      .json({ error: "Only submitted or rejected timesheets can be recalled" });

  await pool.query(
    "UPDATE timesheets SET status = 'draft', submitted_at = NULL WHERE id = $1",
    [sheet.id],
  );
  res.json({ ok: true });
});

// Submit timesheet for review
router.post("/:id/submit", requireAuth, async (req, res) => {
  const sheetResult = await pool.query(
    "SELECT * FROM timesheets WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id],
  );
  const sheet = sheetResult.rows[0];
  if (!sheet) return res.status(404).json({ error: "Not found" });
  if (sheet.status !== "draft")
    return res
      .status(400)
      .json({ error: "Only draft timesheets can be submitted" });

  await pool.query(
    "UPDATE timesheets SET status = 'submitted', submitted_at = NOW() WHERE id = $1",
    [sheet.id],
  );
  res.json({ ok: true });
});

module.exports = router;
