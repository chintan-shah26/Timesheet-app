# TimeSheet App

Weekly attendance tracking and monthly billing for contract workers.

## Features

- **Workers** log in via Google and submit weekly timesheets (Mon–Sun)
  - Each day: Present/Absent toggle, hours worked, work type (Remote/On-site/Leave/Holiday), notes
  - Save as draft or submit for review
- **Admin** reviews submitted timesheets and approves or rejects (with optional note)
- **Monthly Report** shows per-worker billing: present days + total hours, with CSV export

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | Google OAuth 2.0 (Passport.js) |

---

## Setup

### 1. Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
4. Copy the **Client ID** and **Client Secret**

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and a random SESSION_SECRET
npm install
npm run dev       # starts on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev       # starts on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

### First login

The **first Google account** to sign in automatically becomes **admin**. All subsequent accounts are `worker` role. You can promote/demote roles via the admin API (`PATCH /api/admin/users/:id/role`).

---

## Project Structure

```
timesheet-app/
├── backend/
│   ├── data/              # SQLite DB files (git-ignored)
│   ├── src/
│   │   ├── index.js       # Express server entry
│   │   ├── db.js          # SQLite schema + migrations
│   │   ├── auth.js        # Passport Google OAuth
│   │   └── routes/
│   │       ├── auth.js        # /api/auth/*
│   │       ├── timesheets.js  # /api/timesheets/* (worker)
│   │       └── admin.js       # /api/admin/* (admin)
│   └── .env.example
└── frontend/
    └── src/
        ├── App.jsx              # Router + AuthContext
        ├── api/client.js        # Axios instance
        ├── components/
        │   ├── NavBar.jsx
        │   ├── DayRow.jsx       # Single day entry row
        │   └── TimesheetStatusBadge.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx          # Worker timesheet list
            ├── WeeklyTimesheet.jsx    # Worker fill/submit sheet
            ├── AdminDashboard.jsx     # Admin review queue
            └── MonthlyReport.jsx      # Admin billing report
```

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/google` | Start Google login |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Sign out |

### Worker
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/timesheets` | List own timesheets |
| GET | `/api/timesheets/:id` | Get timesheet + entries |
| POST | `/api/timesheets` | Create for a week |
| PUT | `/api/timesheets/:id/entries` | Save day entries |
| POST | `/api/timesheets/:id/submit` | Submit for review |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/timesheets` | All timesheets (filter: status, user_id, month) |
| GET | `/api/admin/timesheets/:id` | Timesheet detail |
| POST | `/api/admin/timesheets/:id/approve` | Approve |
| POST | `/api/admin/timesheets/:id/reject` | Reject with note |
| GET | `/api/admin/reports/monthly?month=YYYY-MM` | Monthly billing |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id/role` | Change role |
