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
      role          TEXT NOT NULL DEFAULT 'worker',
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
  `);
}

module.exports = { pool, initSchema };
