# Timesheet App

Full-stack timesheet management system for tracking worker hours, submitting timesheets for admin review, and generating monthly billing reports.

## Features

### Worker

- Log in with email/password and submit weekly timesheets (Mon–Sun)
- Each day: Present/Absent toggle, hours worked, work type (Remote / On-site / Leave / Holiday), optional notes
- Save as draft, submit for review, or recall a submitted sheet before it's approved
- **Copy last week** — copy prior week's entries into a new draft in one click
- **Leave balance tracker** — see allocated vs used leave days for the year
- **Public holiday pre-fill** — holidays are automatically marked when creating a new week
- **Overtime tracking** — per-entry and total overtime hours shown on timesheet detail
- **PDF export** — download a formatted PDF of any submitted/approved timesheet

### Admin

- Review, approve, or reject submitted timesheets (with optional rejection note)
- **Bulk approve** — approve multiple timesheets in one action
- **Team management** — create teams, assign workers, designate team leads
- **User management** — create accounts, change roles (`worker` / `team_lead` / `admin`), reset passwords, delete users
- **Monthly billing report** — per-worker summary (present days, total hours, overtime) with team filter
- **Employee monthly report** — per-employee daily breakdown for a given month
- **Weekly summary chart** — bar chart of team hours across the last N weeks
- **Public holiday management** — add/remove public holidays that auto-fill worker timesheets
- **Leave balance management** — set annual leave allocations per worker
- **Settings** — configure overtime threshold (hours/day)
- **Audit log** — full paginated history of all actions (approve, reject, submit, recall, user create/delete/role-change/password-reset) with actor, target, and metadata; filterable by action, actor, and date range
- **PDF export** — download formatted PDF for any timesheet

### UI

- GIPS console-style layout: fixed left sidebar with icons, top header bar with user avatar
- Light theme throughout; official Rubrik logo mark in sidebar
- Role-based navigation — workers and admins see different sidebar links

---

## Tech Stack

| Layer        | Tech                                      |
| ------------ | ----------------------------------------- |
| Frontend     | Next.js 15 + React 19 + TypeScript        |
| Styling      | Tailwind CSS 4 + CVA                      |
| Server state | TanStack Query v5                         |
| Forms        | React Hook Form v7                        |
| Tables       | TanStack Table v8                         |
| Charts       | Recharts                                  |
| Backend      | Node.js + Express 5                       |
| Database     | PostgreSQL                                |
| Auth         | Email/password (bcrypt) + express-session |
| PDF          | PDFKit (server-side streaming)            |

---

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in SESSION_SECRET and DATABASE_URL
npm install
npm run dev       # starts on http://localhost:3001
```

**`backend/.env` variables:**

| Variable         | Required | Default                 | Description                       |
| ---------------- | -------- | ----------------------- | --------------------------------- |
| `SESSION_SECRET` | Yes      | —                       | Random string for session signing |
| `DATABASE_URL`   | Yes      | —                       | PostgreSQL connection string      |
| `PORT`           | No       | `3001`                  | Server port                       |
| `FRONTEND_URL`   | No       | `http://localhost:5174` | Allowed CORS origin               |
| `SENTRY_DSN`     | No       | —                       | Sentry error tracking DSN         |

### 2. Frontend

```bash
cd frontend-next
cp .env.example .env
npm install
npm run dev       # starts on http://localhost:5174
```

**`frontend-next/.env` variables:**

| Variable                 | Required | Default                 | Description              |
| ------------------------ | -------- | ----------------------- | ------------------------ |
| `NEXT_PUBLIC_API_URL`    | No       | `http://localhost:3001` | Backend base URL         |
| `NEXT_PUBLIC_SENTRY_DSN` | No       | —                       | Sentry DSN (client-side) |
| `SENTRY_DSN`             | No       | —                       | Sentry DSN (server-side) |

Open `http://localhost:5174` in your browser.

### First login

On first run (no users in the database), the app redirects to `/setup` where you create the first **admin** account. All subsequent users are created by an admin via the Users page. Roles can be changed via the admin UI.

---

## Project Structure

```
timesheet-app/
├── backend/
│   └── src/
│       ├── index.js           # Express entry: middleware, session, routes
│       ├── db.js              # PostgreSQL pool + schema init (all tables)
│       ├── auth.js            # bcrypt hashPassword/verifyPassword helpers
│       ├── audit.js           # logAction() helper for audit log writes
│       ├── lib/
│       │   └── pdf.js         # PDFKit streaming helper
│       └── routes/
│           ├── auth.js        # /api/auth/*
│           ├── timesheets.js  # /api/timesheets/* (worker)
│           └── admin.js       # /api/admin/* (admin + team lead)
└── frontend-next/
    └── src/
        ├── app/
        │   ├── layout.tsx                   # Root layout
        │   ├── (protected)/                 # Authenticated pages (Sidebar + AuthGate)
        │   │   ├── dashboard/               # Worker timesheet list
        │   │   ├── timesheets/[id]/         # Weekly timesheet fill/submit
        │   │   └── admin/
        │   │       ├── page.tsx             # Admin review queue + weekly chart
        │   │       ├── reports/             # Monthly billing report + employee detail
        │   │       ├── teams/               # Team management
        │   │       ├── users/               # User management
        │   │       ├── holidays/            # Public holiday management
        │   │       ├── leave/               # Leave balance management
        │   │       ├── audit/               # Audit log (paginated, filtered)
        │   │       └── settings/            # App settings (overtime threshold)
        │   ├── login/
        │   └── setup/
        ├── api/                             # Typed API functions (auth, timesheets, admin)
        ├── components/
        │   ├── common/                      # Button, Badge, Card, Input, Select, Textarea, Modal
        │   ├── layouts/                     # Sidebar, TopBar
        │   ├── pages/                       # Page-specific components (DayRow, etc.)
        │   └── providers.tsx                # QueryClientProvider + AuthProvider wrapper
        ├── config/                          # Axios instance
        ├── context/                         # AuthContext
        └── types/                           # All TypeScript types
```

---

## Data Model

| Table               | Key columns                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `users`             | `id`, `email`, `name`, `password_hash`, `role` (`worker`\|`team_lead`\|`admin`)                                      |
| `timesheets`        | `id`, `user_id`, `week_start`, `status` (`draft`\|`submitted`\|`approved`\|`rejected`), `admin_note`, `submitted_at` |
| `timesheet_entries` | `id`, `timesheet_id`, `date`, `is_present`, `hours`, `work_type` (`Remote`\|`On-site`\|`Leave`\|`Holiday`), `notes`  |
| `teams`             | `id`, `name`, `description`                                                                                          |
| `team_members`      | `team_id`, `user_id`, `is_lead`                                                                                      |
| `public_holidays`   | `id`, `date`, `name`                                                                                                 |
| `leave_balances`    | `user_id`, `year`, `allocated_days`                                                                                  |
| `app_settings`      | `key`, `value` (e.g. `overtime_threshold_hours = 8`)                                                                 |
| `audit_logs`        | `id`, `actor_id`, `actor_name`, `action`, `target_type`, `target_id`, `target_name`, `metadata`, `created_at`        |

---

## API Reference

### Auth

| Method | Path                    | Description                                      |
| ------ | ----------------------- | ------------------------------------------------ |
| GET    | `/api/auth/needs-setup` | Returns `{ needsSetup: true }` if no users exist |
| POST   | `/api/auth/setup`       | Create first admin account                       |
| POST   | `/api/auth/login`       | Email/password login                             |
| GET    | `/api/auth/me`          | Current user                                     |
| POST   | `/api/auth/logout`      | Sign out                                         |

### Worker — Timesheets

| Method | Path                                 | Description                                     |
| ------ | ------------------------------------ | ----------------------------------------------- |
| GET    | `/api/timesheets`                    | List own timesheets                             |
| GET    | `/api/timesheets/weekly-summary`     | Hours/days per week for last N weeks            |
| GET    | `/api/timesheets/leave-balance`      | Leave balance for current year                  |
| GET    | `/api/timesheets/:id`                | Timesheet + entries + overtime per entry        |
| GET    | `/api/timesheets/:id/export/pdf`     | Stream PDF export                               |
| POST   | `/api/timesheets`                    | Create for a week (pre-fills public holidays)   |
| PUT    | `/api/timesheets/:id/entries`        | Save day entries                                |
| POST   | `/api/timesheets/:id/submit`         | Submit for review                               |
| POST   | `/api/timesheets/:id/recall`         | Recall a submitted/rejected sheet back to draft |
| POST   | `/api/timesheets/:id/copy-last-week` | Copy prior week's entries into this draft       |

### Admin — Timesheets

| Method | Path                                   | Description                                                      |
| ------ | -------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/admin/timesheets`                | All timesheets (filter: `status`, `user_id`, `month`, `team_id`) |
| GET    | `/api/admin/timesheets/:id`            | Timesheet detail + entries                                       |
| GET    | `/api/admin/timesheets/:id/export/pdf` | Stream PDF export                                                |
| POST   | `/api/admin/timesheets/:id/approve`    | Approve                                                          |
| POST   | `/api/admin/timesheets/:id/reject`     | Reject with note                                                 |
| POST   | `/api/admin/timesheets/bulk-approve`   | Approve multiple timesheets (`{ ids: number[] }`)                |

### Admin — Reports

| Method | Path                                                          | Description                            |
| ------ | ------------------------------------------------------------- | -------------------------------------- |
| GET    | `/api/admin/reports/monthly?month=YYYY-MM[&team_id=N]`        | Team monthly summary with overtime     |
| GET    | `/api/admin/reports/monthly/employee?month=YYYY-MM&user_id=N` | Per-employee daily breakdown           |
| GET    | `/api/admin/reports/weekly-summary?weeks=N[&team_id=N]`       | Weekly hours chart data (last N weeks) |

### Admin — Users

| Method | Path                            | Description                                       |
| ------ | ------------------------------- | ------------------------------------------------- |
| GET    | `/api/admin/users`              | List all users                                    |
| POST   | `/api/admin/users`              | Create user account                               |
| PATCH  | `/api/admin/users/:id/role`     | Change role (`worker`\|`team_lead`\|`admin`)      |
| PATCH  | `/api/admin/users/:id/password` | Reset password                                    |
| DELETE | `/api/admin/users/:id`          | Delete user (blocks self-deletion and last admin) |

### Admin — Teams

| Method | Path                                   | Description                       |
| ------ | -------------------------------------- | --------------------------------- |
| GET    | `/api/admin/teams`                     | List all teams                    |
| POST   | `/api/admin/teams`                     | Create team                       |
| GET    | `/api/admin/teams/:id`                 | Team detail + members             |
| PUT    | `/api/admin/teams/:id`                 | Update team name/description      |
| DELETE | `/api/admin/teams/:id`                 | Delete team                       |
| POST   | `/api/admin/teams/:id/members`         | Add member (`user_id`, `is_lead`) |
| PATCH  | `/api/admin/teams/:id/members/:userId` | Toggle lead status                |
| DELETE | `/api/admin/teams/:id/members/:userId` | Remove member                     |

### Admin — Holidays & Leave

| Method | Path                                  | Description                                                |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/admin/holidays?year=YYYY`       | List public holidays for a year                            |
| POST   | `/api/admin/holidays`                 | Add public holiday (`date`, `name`)                        |
| DELETE | `/api/admin/holidays/:id`             | Remove public holiday                                      |
| GET    | `/api/admin/leave-balances?year=YYYY` | All workers' leave balances for a year                     |
| POST   | `/api/admin/leave-balances`           | Set leave allocation (`user_id`, `year`, `allocated_days`) |

### Admin — Settings & Audit

| Method | Path                  | Description                                                              |
| ------ | --------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/admin/settings` | Get all app settings                                                     |
| PATCH  | `/api/admin/settings` | Update a setting (`key`, `value`)                                        |
| GET    | `/api/admin/audit`    | Paginated audit log (filter: `action`, `actor_id`, `from`, `to`, `page`) |
