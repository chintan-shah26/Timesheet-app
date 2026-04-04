# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Full engineering standards and conventions**: see [`specs/project-spec.md`](specs/project-spec.md).

## Project Overview

**Timesheet App** — full-stack timesheet management system for tracking worker hours, submitting timesheets for admin review, and generating monthly billing reports.

- **Team**: GIPS Team
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 + TanStack Query + React Hook Form + TanStack Table
- **Backend**: Node.js + Express 5 + PostgreSQL + session-based auth

## Commands

### Backend (from `backend/`)

```bash
npm install          # install dependencies
npm run dev          # start with --watch on http://localhost:3001
npm start            # start without watch
```

### Frontend (from `frontend-next/`)

```bash
npm install          # install dependencies
npm run dev          # start Next.js dev server on http://localhost:5174
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
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

### Frontend (`frontend-next/src/`)

- `app/layout.tsx` — root layout: QueryClientProvider + AuthProvider; Inter font
- `app/(protected)/layout.tsx` — authenticated layout: NavBar + AuthGate
- `config/api-client.ts` — Axios instance (`localhost:3001`, `withCredentials: true`)
- `context/auth-context.tsx` — AuthProvider + useAuth hook
- `components/common/auth-gate.tsx` — client-side route guard (replaces middleware)
- `api/` — typed API functions: `auth.ts`, `timesheets.ts`, `admin.ts`
- `types/index.ts` — all TypeScript types: User, Timesheet, TimesheetEntry, etc.
- `components/common/` — Button, Badge, Card, Input, Select, Textarea, Modal (all CVA)
- `components/layouts/nav-bar.tsx` — NavBar with role-based links
- `components/pages/weekly-timesheet/day-row.tsx` — DayRow using useFormContext
- `app/(protected)/` — all authenticated pages (worker dashboard, timesheets, admin)

### Data model

- **users**: id, email, name, password_hash, role (`worker`|`admin`)
- **timesheets**: one per user per week (`user_id` + `week_start` unique), status (`draft`|`submitted`|`approved`|`rejected`)
- **timesheet_entries**: one per day per timesheet — `is_present`, `hours`, `work_type` (`Remote`|`On-site`|`Leave`|`Holiday`), `notes`

## Directory Structure

```
CLAUDE.md
specs/
  project-spec.md       — full engineering standards
  ROADMAP.md            — feature pipeline
  NNN-feature-name/
    spec.md
backend/src/
frontend-next/src/
  app/
    (protected)/        — authenticated pages (NavBar + AuthGate layout)
    login/
    setup/
  api/                  — typed API functions per domain
  components/
    common/             — shared UI components (Button, Badge, Card…)
    layouts/            — NavBar
    pages/              — page-specific components
  config/               — Axios instance
  context/              — AuthContext
  types/                — TypeScript types
```

## Environment Setup

Backend requires `backend/.env` (copy from `.env.example`):

- `SESSION_SECRET` — random string for session signing
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — defaults to 3001
- `FRONTEND_URL` — defaults to `http://localhost:5174` (used for CORS)

Frontend requires `frontend-next/.env` (copy from `.env.example`):

- `NEXT_PUBLIC_API_URL` — defaults to `http://localhost:3001`
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry DSN (leave blank in development)

## Key Rules for Claude

- **Spec first**: all non-trivial features require a spec in `specs/` before implementation
- **No hardcoded secrets**: always use environment variables
- **No `any`**: use `unknown` when type is genuinely unknown; all API shapes must be typed in `types/index.ts`
- **TanStack Query for all server state**: no raw `useEffect` data fetching
- **React Hook Form for all forms**: no manual `useState` field chains
- **TanStack Table for all tabular data**: no raw `<table>` without column definitions
- **Tailwind + CVA for all styling**: no inline `style={{}}` or custom CSS classes
- **No direct commits to main**: all changes via PR with 2 reviewers
- **Security headers**: helmet is active on backend — do not disable it
