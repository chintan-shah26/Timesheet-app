# Project Spec: Timesheet App

## Overview

**Purpose**: Full-stack timesheet management application for tracking worker hours, submitting timesheets for review, and generating monthly billing reports. Workers log daily attendance and hours; admins approve/reject submissions and export reports.
**Team**: GIPS Team

## Tech Stack

### Frontend

- Next.js 15, React 19, TypeScript
- Tailwind CSS 4 (CSS-first config, design tokens in `globals.css`)
- CVA + clsx (component variants)
- TanStack Query v5 (server state)
- React Hook Form v7 (forms)
- TanStack Table v8 (tabular data)
- Axios (HTTP client, `withCredentials: true`)
- date-fns, Sentry

### Backend

- Node.js, Express.js 5
- PostgreSQL (via `pg`)
- express-session (session-based auth)
- bcrypt (password hashing)
- helmet (security headers)
- express-rate-limit
- exceljs (report export)
- Sentry (error monitoring)

### Infrastructure

- PM2 (process management)
- Environment-based config via dotenv

## Engineering Standards

### Process Governance

- Spec-driven development: feature spec required before implementation code
- TDD: write tests first, red-green-refactor
- PR requirements: 2 human reviewers + automated review
- No direct commits to main or develop — all changes via PR

### Security

- No hardcoded secrets — use environment variables or secret manager
- Input validation at all system boundaries
- Least-privilege access control
- Dependencies pinned and regularly updated
- helmet middleware enabled on all routes

### Code Quality

- Error handling: wrap errors with context, never discard
- Logging: structured logging via Sentry + console (structured JSON preferred)
- Testing: unit + integration tests, mock only at external boundaries
- No test runner configured yet — add Jest or Vitest before writing tests

### Observability

- Sentry integrated on both frontend and backend
- Health endpoint: add `/healthz` to backend (not yet implemented)

## Conventions

- **Branch naming**: `feature/123-short-description`, `hotfix/456-short-description`
- **PR requirements**: 2 human reviewers + automated review
- **Coverage thresholds**: ≥50% on develop, ≥80% on main
- **Release format**: `vMAJOR.MONTH.PATCH`

## Build & Test Commands

```bash
# Backend (from backend/)
npm install
npm run dev       # node --watch on http://localhost:3001
npm start         # production start

# Frontend (from frontend-next/)
npm install
npm run dev       # Next.js dev server on http://localhost:5174
npm run build     # production build
npm run typecheck # tsc --noEmit
npm run lint      # ESLint
```

## Directory Structure

```
CLAUDE.md
specs/
  project-spec.md
  ROADMAP.md
  NNN-feature-name/
    spec.md
backend/
  src/
    index.js       — Express entry, middleware, route mounting
    db.js          — PostgreSQL singleton (getDb)
    auth.js        — bcrypt helpers
    routes/
      auth.js      — /needs-setup, /setup, /login, /me, /logout
      timesheets.js — worker CRUD + submit
      admin.js     — admin approve/reject, billing report, user mgmt
frontend-next/src/
  app/
    (protected)/   — authenticated pages (NavBar + AuthGate layout)
    login/         — login page
    setup/         — first-time setup page
  api/             — typed API functions (auth.ts, timesheets.ts, admin.ts)
  components/
    common/        — Button, Badge, Card, Input, Select, Textarea, Modal, AuthGate
    layouts/       — NavBar
    pages/         — page-specific components (DayRow)
  config/          — Axios instance (api-client.ts)
  context/         — AuthProvider, useAuth (auth-context.tsx)
  types/           — all TypeScript types (index.ts)
```

## Data Model

- **users**: id, email, name, password_hash, role (`worker`|`admin`)
- **timesheets**: id, user_id, week_start (unique per user/week), status (`draft`|`submitted`|`approved`|`rejected`)
- **timesheet_entries**: id, timesheet_id, date, is_present, hours, work_type (`Remote`|`On-site`|`Leave`|`Holiday`), notes

## Convention Rules

Active rule files for this project:

- `rules/security-baseline.md` — always active
- `rules/frontend-conventions.md` — active (Next.js/TypeScript/Tailwind/CVA/TanStack)
- `rules/design-tokens.md` — active
