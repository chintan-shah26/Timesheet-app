const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost/timesheet_db",
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'team_lead', 'admin')),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS timesheets (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      week_start   DATE NOT NULL,
      status       TEXT NOT NULL DEFAULT 'draft',
      admin_note   TEXT,
      submitted_at TIMESTAMPTZ,
      reviewed_at  TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS timesheet_entries (
      id           SERIAL PRIMARY KEY,
      timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
      date         DATE NOT NULL,
      is_present   BOOLEAN NOT NULL DEFAULT FALSE,
      hours        NUMERIC(5,2),
      work_type    TEXT,
      notes        TEXT,
      UNIQUE(timesheet_id, date)
    );

    CREATE TABLE IF NOT EXISTS public_holidays (
      id         SERIAL PRIMARY KEY,
      date       DATE NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS leave_balances (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year           INTEGER NOT NULL,
      allocated_days INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, year)
    );

    CREATE TABLE IF NOT EXISTS teams (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS team_members (
      team_id   INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_lead   BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id          SERIAL PRIMARY KEY,
      actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_name  TEXT,
      action      TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id   INTEGER,
      target_name TEXT,
      metadata    JSONB,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx   ON audit_logs (actor_id);
    CREATE INDEX IF NOT EXISTS audit_logs_action_idx     ON audit_logs (action);
    CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);
  `);

  // Seed default settings (idempotent)
  await pool.query(`
    INSERT INTO app_settings (key, value)
    VALUES ('overtime_threshold_hours', '8')
    ON CONFLICT (key) DO NOTHING
  `);
}

module.exports = { pool, initSchema };
