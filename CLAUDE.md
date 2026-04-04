# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (from `backend/`)
```bash
npm install          # install dependencies
npm run dev          # start with --watch on http://localhost:3001
npm start            # start without watch
```

### Frontend (from `frontend/`)
```bash
npm install          # install dependencies
npm run dev          # start Vite dev server on http://localhost:5173
npm run build        # production build
npm run lint         # ESLint
npm run preview      # preview production build
```

No test runner is configured in either package.

## Architecture

Full-stack app: React/Vite frontend + Express/SQLite backend, communicating over HTTP with session-based auth.

### Auth flow
The README mentions Google OAuth but the actual implementation uses **email/password + bcrypt**. On app load, the frontend calls `/api/auth/needs-setup` — if no users exist, the `/setup` route creates the first admin account. All subsequent users are added by admin via `POST /api/admin/users`. Sessions are stored in SQLite via `connect-sqlite3`.

### Backend (`backend/src/`)
- `index.js` — Express entry: sets up CORS, JSON, session middleware, attaches `req.user` from session on every request, mounts routes
- `db.js` — singleton `getDb()` that lazily opens the SQLite database, runs `CREATE TABLE IF NOT EXISTS` for `users`, `timesheets`, `timesheet_entries` (schema is inline, no migration system)
- `auth.js` — bcrypt `hashPassword`/`verifyPassword` helpers
- `routes/auth.js` — `/needs-setup`, `/setup`, `/login`, `/me`, `/logout`
- `routes/timesheets.js` — worker endpoints: CRUD timesheets + entries, submit for review
- `routes/admin.js` — admin endpoints: list/approve/reject timesheets, monthly billing report, user management

Database files live in `data/` (git-ignored): `timesheet.db` and `sessions.db`.

### Frontend (`frontend/src/`)
- `App.jsx` — `AuthContext` provider wrapping `BrowserRouter`; checks auth + setup state on mount; `ProtectedRoute` handles role-based redirects
- `api/client.js` — Axios instance pointing to `http://localhost:3001` with `withCredentials: true`
- `pages/` — `Login`, `Setup`, `Dashboard` (worker), `WeeklyTimesheet`, `AdminDashboard`, `MonthlyReport`, `ManageUsers`
- `components/` — `NavBar`, `DayRow` (single day entry row in the weekly sheet), `TimesheetStatusBadge`

### Data model
- **users**: id, email, name, password_hash, role (`worker`|`admin`)
- **timesheets**: one per user per week (`user_id` + `week_start` unique), status (`draft`|`submitted`|`approved`|`rejected`)
- **timesheet_entries**: one per day per timesheet, stores `is_present`, `hours`, `work_type` (`Remote`|`On-site`|`Leave`|`Holiday`), `notes`

## Environment setup

Backend requires `backend/.env` (copy from `.env.example`):
- `SESSION_SECRET` — random string for session signing
- `PORT` — defaults to 3001
- `FRONTEND_URL` — defaults to `http://localhost:5173` (used for CORS)

Frontend requires `frontend/.env` (copy from `.env.example`) if the backend URL differs from the default.
