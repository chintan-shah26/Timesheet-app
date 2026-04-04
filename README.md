# TimeSheet App

Weekly attendance tracking and monthly billing for contract workers.

## Features

- **Workers** log in with email/password and submit weekly timesheets (Mon–Sun)
  - Each day: Present/Absent toggle, hours worked, work type (Remote/On-site/Leave/Holiday), notes
  - Save as draft or submit for review; recall and edit a submitted sheet before it's reviewed
- **Admin** reviews submitted timesheets and approves or rejects (with optional note)
- **Monthly Report** shows per-worker billing: present days + total hours, with CSV and Excel export
- **User management**: admin can create accounts, change roles, reset passwords, and delete workers

## Tech Stack

| Layer        | Tech                                      |
| ------------ | ----------------------------------------- |
| Frontend     | Next.js 15 + React 19 + TypeScript        |
| Styling      | Tailwind CSS 4 + CVA                      |
| Server state | TanStack Query v5                         |
| Forms        | React Hook Form v7                        |
| Tables       | TanStack Table v8                         |
| Backend      | Node.js + Express 5                       |
| Database     | PostgreSQL                                |
| Auth         | Email/password (bcrypt) + express-session |

---

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in SESSION_SECRET (any random string) and DATABASE_URL
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

On first run (no users in the database), the app redirects to `/setup` where you create the first **admin** account. All subsequent users are created by an admin via the Users page or `POST /api/admin/users`. You can change roles via the admin UI or `PATCH /api/admin/users/:id/role`.

---

## Project Structure

```
timesheet-app/
├── backend/
│   └── src/
│       ├── index.js       # Express entry: middleware, session, routes
│       ├── db.js          # PostgreSQL pool + schema init
│       ├── auth.js        # bcrypt hashPassword/verifyPassword helpers
│       └── routes/
│           ├── auth.js        # /api/auth/*
│           ├── timesheets.js  # /api/timesheets/* (worker)
│           └── admin.js       # /api/admin/* (admin)
└── frontend-next/
    └── src/
        ├── app/
        │   ├── layout.tsx              # Root layout (Server Component)
        │   ├── (protected)/            # Authenticated pages (NavBar + AuthGate)
        │   │   ├── dashboard/          # Worker timesheet list
        │   │   ├── timesheets/[id]/    # Weekly timesheet fill/submit
        │   │   └── admin/
        │   │       ├── page.tsx        # Admin review queue
        │   │       ├── reports/        # Monthly billing report
        │   │       └── users/          # User management
        │   ├── login/
        │   └── setup/
        ├── api/                        # Typed API functions (auth, timesheets, admin)
        ├── components/
        │   ├── common/                 # Button, Badge, Card, Input, Select, Textarea, Modal
        │   ├── layouts/                # NavBar
        │   ├── pages/                  # Page-specific components (DayRow, etc.)
        │   └── providers.tsx           # QueryClientProvider + AuthProvider wrapper
        ├── config/                     # Axios instance
        ├── context/                    # AuthContext (TanStack Query-backed)
        └── types/                      # All TypeScript types
```

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

### Worker

| Method | Path                          | Description                                |
| ------ | ----------------------------- | ------------------------------------------ |
| GET    | `/api/timesheets`             | List own timesheets                        |
| GET    | `/api/timesheets/:id`         | Get timesheet + entries                    |
| POST   | `/api/timesheets`             | Create for a week                          |
| PUT    | `/api/timesheets/:id/entries` | Save day entries                           |
| POST   | `/api/timesheets/:id/submit`  | Submit for review                          |
| POST   | `/api/timesheets/:id/recall`  | Recall a submitted timesheet back to draft |

### Admin — Timesheets

| Method | Path                                | Description                                           |
| ------ | ----------------------------------- | ----------------------------------------------------- |
| GET    | `/api/admin/timesheets`             | All timesheets (filter: `status`, `user_id`, `month`) |
| GET    | `/api/admin/timesheets/:id`         | Timesheet detail                                      |
| POST   | `/api/admin/timesheets/:id/approve` | Approve                                               |
| POST   | `/api/admin/timesheets/:id/reject`  | Reject with note                                      |

### Admin — Reports

| Method | Path                                                          | Description                        |
| ------ | ------------------------------------------------------------- | ---------------------------------- |
| GET    | `/api/admin/reports/monthly?month=YYYY-MM`                    | Team summary (approved timesheets) |
| GET    | `/api/admin/reports/monthly/employee?month=YYYY-MM&user_id=N` | Per-employee detail                |
| GET    | `/api/admin/reports/monthly/export?month=YYYY-MM[&user_id=N]` | Excel export                       |

### Admin — Users

| Method | Path                            | Description                                       |
| ------ | ------------------------------- | ------------------------------------------------- |
| GET    | `/api/admin/users`              | List all users                                    |
| POST   | `/api/admin/users`              | Create user account                               |
| PATCH  | `/api/admin/users/:id/role`     | Change role (`worker`\|`admin`)                   |
| PATCH  | `/api/admin/users/:id/password` | Reset password                                    |
| DELETE | `/api/admin/users/:id`          | Delete user (blocks self-deletion and last admin) |
