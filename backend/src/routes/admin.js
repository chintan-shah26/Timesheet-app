const express = require("express");
const ExcelJS = require("exceljs");
const { pool } = require("../db");
const { hashPassword } = require("../auth");
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}

// List all timesheets (filterable by status, worker, month)
router.get("/timesheets", requireAdmin, async (req, res) => {
  const { status, user_id, month } = req.query;
  const params = [];
  const conditions = ["1=1"];

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (user_id) {
    params.push(user_id);
    conditions.push(`t.user_id = $${params.length}`);
  }
  if (month) {
    params.push(month);
    conditions.push(`TO_CHAR(t.week_start, 'YYYY-MM') = $${params.length}`);
  }

  const result = await pool.query(
    `
    SELECT t.*, u.name AS worker_name, u.email AS worker_email,
      (SELECT COUNT(*) FROM timesheet_entries e WHERE e.timesheet_id = t.id AND e.is_present = TRUE) AS present_days,
      (SELECT COALESCE(SUM(e.hours), 0) FROM timesheet_entries e WHERE e.timesheet_id = t.id AND e.is_present = TRUE) AS total_hours
    FROM timesheets t
    JOIN users u ON u.id = t.user_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY t.week_start DESC, u.name
  `,
    params,
  );
  res.json(result.rows);
});

// Get single timesheet with entries (admin view)
router.get("/timesheets/:id", requireAdmin, async (req, res) => {
  const sheetResult = await pool.query(
    `
    SELECT t.*, u.name AS worker_name, u.email AS worker_email
    FROM timesheets t JOIN users u ON u.id = t.user_id
    WHERE t.id = $1
  `,
    [req.params.id],
  );
  const sheet = sheetResult.rows[0];
  if (!sheet) return res.status(404).json({ error: "Not found" });

  const entries = await pool.query(
    "SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY date",
    [sheet.id],
  );
  res.json({ ...sheet, entries: entries.rows });
});

// Approve timesheet
router.post("/timesheets/:id/approve", requireAdmin, async (req, res) => {
  const sheetResult = await pool.query(
    "SELECT * FROM timesheets WHERE id = $1",
    [req.params.id],
  );
  const sheet = sheetResult.rows[0];
  if (!sheet) return res.status(404).json({ error: "Not found" });
  if (sheet.status !== "submitted")
    return res
      .status(400)
      .json({ error: "Only submitted timesheets can be approved" });

  await pool.query(
    "UPDATE timesheets SET status = 'approved', reviewed_at = NOW(), admin_note = NULL WHERE id = $1",
    [sheet.id],
  );
  res.json({ ok: true });
});

// Reject timesheet
router.post("/timesheets/:id/reject", requireAdmin, async (req, res) => {
  const sheetResult = await pool.query(
    "SELECT * FROM timesheets WHERE id = $1",
    [req.params.id],
  );
  const sheet = sheetResult.rows[0];
  if (!sheet) return res.status(404).json({ error: "Not found" });
  if (sheet.status !== "submitted")
    return res
      .status(400)
      .json({ error: "Only submitted timesheets can be rejected" });

  const { note } = req.body;
  await pool.query(
    "UPDATE timesheets SET status = 'draft', reviewed_at = NOW(), admin_note = $1 WHERE id = $2",
    [note ?? null, sheet.id],
  );
  res.json({ ok: true });
});

// Per-employee monthly detail report
router.get("/reports/monthly/employee", requireAdmin, async (req, res) => {
  const { month, user_id } = req.query;
  if (!month)
    return res
      .status(400)
      .json({ error: "month query param required (YYYY-MM)" });
  if (!/^\d{4}-\d{2}$/.test(month))
    return res.status(400).json({ error: "month must be in YYYY-MM format" });
  if (!user_id)
    return res.status(400).json({ error: "user_id query param required" });

  const userResult = await pool.query(
    "SELECT id, name, email FROM users WHERE id = $1 AND role = 'worker'",
    [user_id],
  );
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ error: "Worker not found" });

  const entries = await pool.query(
    `
    SELECT e.date, e.is_present, e.hours, e.work_type, e.notes,
           t.week_start, t.status AS timesheet_status
    FROM timesheet_entries e
    JOIN timesheets t ON t.id = e.timesheet_id
    WHERE t.user_id = $1 AND TO_CHAR(e.date, 'YYYY-MM') = $2
    ORDER BY e.date
  `,
    [user_id, month],
  );

  const rows = entries.rows;
  const summary = {
    total_present_days: rows.filter((e) => e.is_present).length,
    total_hours: rows.reduce(
      (s, e) => s + (e.is_present && e.hours ? parseFloat(e.hours) : 0),
      0,
    ),
    timesheet_count: new Set(rows.map((e) => e.week_start)).size,
  };

  res.json({ month, user, entries: rows, summary });
});

// Excel export: summary (all workers) or per-employee (with user_id)
router.get("/reports/monthly/export", requireAdmin, async (req, res) => {
  const { month, user_id } = req.query;
  if (!month)
    return res
      .status(400)
      .json({ error: "month query param required (YYYY-MM)" });
  if (!/^\d{4}-\d{2}$/.test(month))
    return res.status(400).json({ error: "month must be in YYYY-MM format" });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Timesheet App";
  workbook.created = new Date();

  if (user_id) {
    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1 AND role = 'worker'",
      [user_id],
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: "Worker not found" });

    const entries = await pool.query(
      `
      SELECT e.date, e.is_present, e.hours, e.work_type, e.notes, t.status AS timesheet_status
      FROM timesheet_entries e
      JOIN timesheets t ON t.id = e.timesheet_id
      WHERE t.user_id = $1 AND TO_CHAR(e.date, 'YYYY-MM') = $2
      ORDER BY e.date
    `,
      [user_id, month],
    );

    const sheet = workbook.addWorksheet(user.name);
    sheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Present", key: "present", width: 10 },
      { header: "Hours", key: "hours", width: 8 },
      { header: "Work Type", key: "work_type", width: 14 },
      { header: "Notes", key: "notes", width: 30 },
      { header: "Timesheet Status", key: "status", width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };

    entries.rows.forEach((e) => {
      sheet.addRow({
        date: e.date,
        present: e.is_present ? "Yes" : "No",
        hours: e.is_present && e.hours ? parseFloat(e.hours) : "",
        work_type: e.work_type || "",
        notes: e.notes || "",
        status: e.timesheet_status,
      });
    });

    const presentDays = entries.rows.filter((e) => e.is_present).length;
    const totalHours = entries.rows.reduce(
      (s, e) => s + (e.is_present && e.hours ? parseFloat(e.hours) : 0),
      0,
    );
    sheet.addRow({});
    sheet.addRow({
      date: "TOTAL",
      present: `${presentDays} days`,
      hours: totalHours,
    }).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const safeName = user.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${safeName}-${month}.xlsx"`,
    );
  } else {
    const workers = await pool.query(
      `
      SELECT u.id AS user_id, u.name, u.email,
        COUNT(DISTINCT t.id) AS timesheet_count,
        COALESCE(SUM(CASE WHEN e.is_present = TRUE THEN 1 ELSE 0 END), 0) AS total_present_days,
        COALESCE(SUM(CASE WHEN e.is_present = TRUE THEN e.hours ELSE 0 END), 0) AS total_hours
      FROM users u
      LEFT JOIN timesheets t ON t.user_id = u.id
        AND t.status = 'approved'
        AND TO_CHAR(t.week_start, 'YYYY-MM') = $1
      LEFT JOIN timesheet_entries e ON e.timesheet_id = t.id
      WHERE u.role = 'worker'
      GROUP BY u.id
      ORDER BY u.name
    `,
      [month],
    );

    const sheet = workbook.addWorksheet("Monthly Summary");
    sheet.columns = [
      { header: "Name", key: "name", width: 22 },
      { header: "Email", key: "email", width: 28 },
      { header: "Approved Timesheets", key: "timesheet_count", width: 22 },
      { header: "Present Days", key: "total_present_days", width: 14 },
      { header: "Total Hours", key: "total_hours", width: 14 },
    ];
    sheet.getRow(1).font = { bold: true };
    workers.rows.forEach((w) => sheet.addRow(w));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="monthly-report-${month}.xlsx"`,
    ); // month already validated against /^\d{4}-\d{2}$/ above
  }

  await workbook.xlsx.write(res);
  res.end();
});

// Monthly billing report
router.get("/reports/monthly", requireAdmin, async (req, res) => {
  const { month } = req.query;
  if (!month)
    return res
      .status(400)
      .json({ error: "month query param required (YYYY-MM)" });
  if (!/^\d{4}-\d{2}$/.test(month))
    return res.status(400).json({ error: "month must be in YYYY-MM format" });

  const result = await pool.query(
    `
    SELECT
      u.id AS user_id, u.name, u.email,
      COUNT(DISTINCT t.id) AS timesheet_count,
      COALESCE(SUM(CASE WHEN e.is_present = TRUE THEN 1 ELSE 0 END), 0) AS total_present_days,
      COALESCE(SUM(CASE WHEN e.is_present = TRUE THEN e.hours ELSE 0 END), 0) AS total_hours
    FROM users u
    LEFT JOIN timesheets t ON t.user_id = u.id
      AND t.status = 'approved'
      AND TO_CHAR(t.week_start, 'YYYY-MM') = $1
    LEFT JOIN timesheet_entries e ON e.timesheet_id = t.id
    WHERE u.role = 'worker'
    GROUP BY u.id
    ORDER BY u.name
  `,
    [month],
  );

  res.json({ month, workers: result.rows });
});

// List all users
router.get("/users", requireAdmin, async (req, res) => {
  const result = await pool.query(
    "SELECT id, email, name, role, created_at FROM users ORDER BY name",
  );
  res.json(result.rows);
});

// Create a new user account
router.post("/users", requireAdmin, async (req, res) => {
  const { email, name, password, role = "worker" } = req.body;
  if (!email || !name || !password)
    return res
      .status(400)
      .json({ error: "email, name, and password required" });
  if (!["worker", "admin"].includes(role))
    return res.status(400).json({ error: "Invalid role" });
  if (password.length < 8)
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });

  const hash = await hashPassword(password);
  try {
    const result = await pool.query(
      "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [email.toLowerCase().trim(), name, hash, role],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Email already exists" });
    throw err;
  }
});

// Update user role
router.patch("/users/:id/role", requireAdmin, async (req, res) => {
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ error: "You cannot change your own role" });
  const { role } = req.body;
  if (!["worker", "admin"].includes(role))
    return res.status(400).json({ error: "Invalid role" });

  const result = await pool.query("UPDATE users SET role = $1 WHERE id = $2", [
    role,
    req.params.id,
  ]);
  if (result.rowCount === 0)
    return res.status(404).json({ error: "User not found" });
  res.json({ ok: true });
});

// Delete a user (offboarding) — blocks self-deletion and deleting the last admin
router.delete("/users/:id", requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id)
    return res
      .status(400)
      .json({ error: "You cannot delete your own account" });

  const targetResult = await pool.query(
    "SELECT id, role FROM users WHERE id = $1",
    [targetId],
  );
  const target = targetResult.rows[0];
  if (!target) return res.status(404).json({ error: "User not found" });

  if (target.role === "admin") {
    const countResult = await pool.query(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'",
    );
    if (parseInt(countResult.rows[0].cnt) <= 1) {
      return res
        .status(400)
        .json({ error: "Cannot delete the last admin account" });
    }
  }

  await pool.query("DELETE FROM timesheets WHERE user_id = $1", [targetId]);
  await pool.query("DELETE FROM users WHERE id = $1", [targetId]);
  res.json({ ok: true });
});

// List public holidays (optional ?year=YYYY filter)
router.get("/holidays", requireAdmin, async (req, res) => {
  const { year } = req.query;
  if (year) {
    const yearInt = Number(year);
    if (!Number.isInteger(yearInt) || yearInt < 2000 || yearInt > 2100)
      return res.status(400).json({ error: "Invalid year" });
    const result = await pool.query(
      "SELECT * FROM public_holidays WHERE EXTRACT(YEAR FROM date) = $1 ORDER BY date",
      [yearInt],
    );
    return res.json(result.rows);
  }
  const result = await pool.query(
    "SELECT * FROM public_holidays ORDER BY date",
  );
  res.json(result.rows);
});

// Create a public holiday
router.post("/holidays", requireAdmin, async (req, res) => {
  const { date, name } = req.body;
  if (!date || !name?.trim())
    return res.status(400).json({ error: "date and name are required" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });

  // Reject semantically invalid dates (e.g. 2026-02-30)
  const parsed = new Date(date + "T00:00:00Z");
  if (isNaN(parsed.getTime()) || parsed.toISOString().substring(0, 10) !== date)
    return res.status(400).json({ error: "Invalid calendar date" });

  try {
    const result = await pool.query(
      "INSERT INTO public_holidays (date, name) VALUES ($1, $2) RETURNING *",
      [date, name.trim()],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "A holiday already exists for this date" });
    throw err;
  }
});

// Delete a public holiday
router.delete("/holidays/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ error: "Invalid id" });

  const result = await pool.query("DELETE FROM public_holidays WHERE id = $1", [
    id,
  ]);
  if (result.rowCount === 0)
    return res.status(404).json({ error: "Holiday not found" });
  res.json({ ok: true });
});

// List leave balances for all workers (optional ?year=YYYY)
router.get("/leave-balances", requireAdmin, async (req, res) => {
  const year = req.query.year
    ? Number(req.query.year)
    : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    return res.status(400).json({ error: "Invalid year" });

  const result = await pool.query(
    `SELECT u.id AS user_id, u.name, u.email,
            COALESCE(lb.allocated_days, 0) AS allocated_days,
            COUNT(CASE
              WHEN te.work_type = 'Leave'
               AND te.is_present = TRUE
               AND EXTRACT(YEAR FROM te.date) = $1
               AND t.status IN ('submitted', 'approved')
              THEN 1
            END)::INTEGER AS used_days
     FROM users u
     LEFT JOIN leave_balances lb ON lb.user_id = u.id AND lb.year = $1
     LEFT JOIN timesheets t ON t.user_id = u.id
     LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
     WHERE u.role = 'worker'
     GROUP BY u.id, u.name, u.email, lb.allocated_days
     ORDER BY u.name`,
    [year],
  );
  res.json(result.rows);
});

// Set leave balance for a worker/year (upsert)
router.post("/leave-balances", requireAdmin, async (req, res) => {
  const userId = Number(req.body.user_id);
  const year = Number(req.body.year);
  const days = Number(req.body.allocated_days);

  if (!Number.isInteger(userId) || userId <= 0)
    return res
      .status(400)
      .json({ error: "user_id must be a positive integer" });
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    return res
      .status(400)
      .json({ error: "year must be between 2000 and 2100" });
  if (!Number.isInteger(days) || days < 0 || days > 365)
    return res
      .status(400)
      .json({ error: "allocated_days must be between 0 and 365" });

  const userCheck = await pool.query(
    "SELECT id FROM users WHERE id = $1 AND role = 'worker'",
    [userId],
  );
  if (!userCheck.rows[0])
    return res.status(404).json({ error: "Worker not found" });

  await pool.query(
    `INSERT INTO leave_balances (user_id, year, allocated_days, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, year) DO UPDATE SET
       allocated_days = EXCLUDED.allocated_days,
       updated_at = NOW()`,
    [userId, year, days],
  );
  res.json({ ok: true });
});

// Reset a user's password
router.patch("/users/:id/password", requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8)
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });

  const hash = await hashPassword(password);
  const result = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE id = $2",
    [hash, req.params.id],
  );
  if (result.rowCount === 0)
    return res.status(404).json({ error: "User not found" });
  res.json({ ok: true });
});

module.exports = router;
