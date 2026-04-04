require("dotenv").config();

if (!process.env.SESSION_SECRET) {
  console.error("Fatal: SESSION_SECRET environment variable is required");
  process.exit(1);
}

const Sentry = require("@sentry/node");
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pgSession = require("connect-pg-simple")(session);
const { pool, initSchema } = require("./db");

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "development",
  // Only send errors in production unless DSN is explicitly set
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.2, // capture 20% of transactions for performance
});

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5174";

// Security headers
app.use(helmet());

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
});

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(generalLimiter);

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }),
);

// Attach user to req from session
app.use(async (req, res, next) => {
  try {
    if (req.session.userId) {
      const result = await pool.query(
        "SELECT id, email, name, role FROM users WHERE id = $1",
        [req.session.userId],
      );
      req.user = result.rows[0] || null;
    } else {
      req.user = null;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/setup", authLimiter);
app.use("/api/auth", require("./routes/auth"));
app.use("/api/timesheets", require("./routes/timesheets"));
app.use("/api/admin/teams", require("./routes/teams"));
app.use("/api/admin", require("./routes/admin"));

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Sentry error handler — must be before any other error middleware
Sentry.setupExpressErrorHandler(app);

// Global error handler — catches unhandled errors from all async routes
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// Init DB schema then start server
initSchema()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`Backend running on http://localhost:${PORT}`),
    );

    // Register reminder cron job
    if (process.env.REMINDER_ENABLED !== "false") {
      const cron = require("node-cron");
      const { sendReminderEmails } = require("./jobs/reminder");
      const schedule = process.env.REMINDER_CRON || "0 17 * * 5";
      if (!cron.validate(schedule)) {
        console.error(
          `[reminder] Invalid REMINDER_CRON expression: ${schedule}`,
        );
      } else {
        cron.schedule(schedule, () => {
          console.log("[reminder] Running scheduled reminder job");
          sendReminderEmails().catch((err) => {
            console.error("[reminder] Job failed:", err);
            Sentry.captureException(err);
          });
        });
        console.log(`[reminder] Reminder job scheduled: ${schedule}`);
      }
    } else {
      console.log("[reminder] Reminders disabled (REMINDER_ENABLED=false)");
    }
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
