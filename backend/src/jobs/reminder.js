const nodemailer = require("nodemailer");
const Sentry = require("@sentry/node");
const { pool } = require("../db");

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Returns yyyy-MM-dd for the most recent Monday on or before today (UTC)
function currentWeekStart() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, …
  const diff = day === 0 ? 6 : day - 1;
  const mon = new Date(now);
  mon.setUTCDate(now.getUTCDate() - diff);
  return mon.toISOString().substring(0, 10);
}

async function sendReminderEmails() {
  const weekStart = currentWeekStart();
  const weekEnd = (() => {
    const d = new Date(weekStart + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().substring(0, 10);
  })();

  // Workers whose current-week timesheet is draft or missing
  const result = await pool.query(
    `
    SELECT u.id, u.name, u.email, t.id AS timesheet_id
    FROM users u
    LEFT JOIN timesheets t
      ON t.user_id = u.id AND t.week_start = $1
    WHERE u.role = 'worker'
      AND (t.id IS NULL OR t.status = 'draft')
    ORDER BY u.name
    `,
    [weekStart],
  );

  if (result.rows.length === 0) {
    console.log("[reminder] All workers submitted — no reminders needed.");
    return;
  }

  const transport = createTransport();
  const from = process.env.SMTP_FROM || "timesheet@example.com";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";

  const weekLabel = `${weekStart} – ${weekEnd}`;

  try {
    for (const worker of result.rows) {
      const link = worker.timesheet_id
        ? `${frontendUrl}/timesheets/${worker.timesheet_id}`
        : frontendUrl;

      const safeName = escapeHtml(worker.name);
      const html = `
      <p>Hi ${safeName},</p>
      <p>Your timesheet for the week of <strong>${weekLabel}</strong> hasn't been submitted yet.</p>
      <p>Please <a href="${link}">log in and submit it</a> as soon as possible.</p>
      <p>Thanks,<br>GIPS Timesheet</p>
    `;
      const text = `Hi ${worker.name.replace(/[\r\n]/g, " ")},\n\nYour timesheet for the week of ${weekLabel} hasn't been submitted yet.\nPlease log in and submit it: ${link}\n\nThanks,\nGIPS Timesheet`;

      try {
        await transport.sendMail({
          from,
          to: worker.email,
          subject: `Reminder: submit your timesheet for ${weekLabel}`,
          text,
          html,
        });
        console.log(`[reminder] Sent to ${worker.email}`);
      } catch (err) {
        console.error(
          `[reminder] Failed to send to ${worker.email}:`,
          err.message,
        );
        Sentry.captureException(err, { extra: { worker_id: worker.id } });
      }
    }
  } finally {
    transport.close();
  }
}

module.exports = { sendReminderEmails };
