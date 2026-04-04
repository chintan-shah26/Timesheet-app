# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Full engineering standards and conventions**: see [`specs/project-spec.md`](specs/project-spec.md).

## Project Overview

**Timesheet App** — full-stack timesheet management system for tracking worker hours, submitting timesheets for admin review, and generating monthly billing reports.

- **Team**: GIPS Team
- **Frontend**: React 19 + Vite (migrating to Next.js/TypeScript/Tailwind — see ROADMAP)
- **Backend**: Node.js + Express 5 + PostgreSQL + session-based auth

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

### Auth flow

Email/password + bcrypt. On app load, frontend calls `/api/auth/needs-setup` — if no users exist, `/setup` creates the first admin. All subsequent users are added by admin via `POST /api/admin/users`. Sessions stored in PostgreSQL via `connect-pg-simple`.

### Backend (`backend/src/`)

- `index.js` — Express entry: CORS, JSON, helmet, rate-limit, session middleware, `req.user` attachment, route mounting
- `db.js` — singleton `getDb()` that opens the PostgreSQL connection
- `auth.js` — bcrypt `hashPassword`/`verifyPassword` helpers
- `routes/auth.js` — `/needs-setup`, `/setup`, `/login`, `/me`, `/logout`
- `routes/timesheets.js` — worker endpoints: CRUD timesheets + entries, submit for review
- `routes/admin.js` — admin endpoints: list/approve/reject timesheets, monthly billing report, user management

### Frontend (`frontend/src/`)

- `App.jsx` — `AuthContext` provider wrapping `BrowserRouter`; checks auth + setup state on mount; `ProtectedRoute` handles role-based redirects
- `api/client.js` — Axios instance pointing to `http://localhost:3001` with `withCredentials: true`
- `pages/` — `Login`, `Setup`, `Dashboard` (worker), `WeeklyTimesheet`, `AdminDashboard`, `MonthlyReport`, `ManageUsers`
- `components/` — `NavBar`, `DayRow` (single day entry row in the weekly sheet), `TimesheetStatusBadge`

### Data model

- **users**: id, email, name, password_hash, role (`worker`|`admin`)
- **timesheets**: one per user per week (`user_id` + `week_start` unique), status (`draft`|`submitted`|`approved`|`rejected`)
- **timesheet_entries**: one per day per timesheet — `is_present`, `hours`, `work_type` (`Remote`|`On-site`|`Leave`|`Holiday`), `notes`

## Directory Structure

```
CLAUDE.md
specs/
  project-spec.md     — full engineering standards
  ROADMAP.md          — feature pipeline
  NNN-feature-name/
    spec.md
backend/src/
frontend/src/
```

## Environment Setup

Backend requires `backend/.env` (copy from `.env.example`):

- `SESSION_SECRET` — random string for session signing
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — defaults to 3001
- `FRONTEND_URL` — defaults to `http://localhost:5173` (used for CORS)

Frontend requires `frontend/.env` (copy from `.env.example`) if the backend URL differs from the default.

## Key Rules for Claude

- **Spec first**: all non-trivial features require a spec in `specs/` before implementation
- **No hardcoded secrets**: always use environment variables
- **Input validation at boundaries**: validate all user input and API responses before use
- **No direct commits to main**: all changes via PR with 2 reviewers
- **Security headers**: helmet is active — do not disable it
- **Frontend migration target**: new UI components should prefer TypeScript; migration to Next.js/Tailwind tracked in ROADMAP
