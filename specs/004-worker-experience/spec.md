# Feature Spec: Worker Experience Improvements

**Feature #**: 004
**Status**: implemented
**Date**: 2026-04-04

## Overview

### What

Three quality-of-life improvements for workers:

1. **Leave balance tracker** — each worker has an annual leave allowance; the app tracks days used (entries with `work_type = 'Leave'`) and shows remaining balance
2. **Public holidays calendar** — admin configures public holidays per year; on timesheet creation those dates are pre-filled as `Holiday` type so workers don't mark them manually
3. **Copy last week** — a button on the weekly timesheet page duplicates the previous week's entries (presence, hours, work_type, notes) as a starting point for the current draft

### Why

Workers currently fill in every field from scratch each week and manually track their leave. Pre-filling holidays and copying repeated patterns (e.g. always Remote, 8h) reduces friction and errors. Leave balance visibility helps workers plan time off without back-and-forth with admins.

### Success Criteria

- Admin can set a leave allowance (days) per worker per year
- Worker sees their leave balance (allocated, used, remaining) on their dashboard
- When a new timesheet is created, any configured public holidays in that week are pre-filled as `Holiday`
- "Copy last week" button appears on a draft timesheet; clicking it fills entries from the previous week's timesheet (if one exists)
- Copy does not overwrite entries the worker has already edited in the current week

### Out of Scope

- Leave request / approval workflow — this is balance visibility only
- Multi-country holiday sets per team — deferred to 003 team config
- Carry-over of unused leave between years

---

## Approach

### Technical Design

**Backend — new tables:**

```sql
leave_balances (id, user_id, year, allocated_days, created_at, updated_at)
-- used_days derived at query time by counting Leave entries in approved/submitted timesheets

public_holidays (id, date, name, created_at)
-- global list managed by admin; date is unique
```

**API additions:**

- `GET /api/timesheets/leave-balance?year=YYYY` — worker's balance for a year (allocated, used, remaining)
- `GET/POST /api/admin/leave-balances` — admin list/set balances per worker per year
- `GET/POST/DELETE /api/admin/holidays` — admin manage public holidays
- `POST /api/timesheets/:id/copy-last-week` — copies entries from the previous week's timesheet into this draft (skips entries already edited)

**Timesheet creation change:**

- When `POST /api/timesheets` creates a new timesheet + 7 entries, check `public_holidays` for dates in that week and set `work_type = 'Holiday'`, `is_present = false` for matching entries

### Components

- `backend/src/db.js` — add `leave_balances`, `public_holidays` tables
- `backend/src/routes/timesheets.js` — holiday pre-fill on create; add `copy-last-week` endpoint; add `leave-balance` endpoint
- `backend/src/routes/admin.js` — leave balance CRUD; holiday CRUD
- `frontend-next/src/app/(protected)/page.tsx` — show leave balance widget on worker dashboard
- `frontend-next/src/app/(protected)/timesheets/[id]/page.tsx` — add "Copy last week" button
- `frontend-next/src/app/(protected)/admin/holidays/page.tsx` — new admin page for holiday management
- `frontend-next/src/app/(protected)/admin/leave/page.tsx` — new admin page for leave balance management
- `frontend-next/src/api/timesheets.ts` — add `getLeaveBalance`, `copyLastWeek`
- `frontend-next/src/api/admin.ts` — add holiday + leave balance API functions
- `frontend-next/src/types/index.ts` — add `LeaveBalance`, `PublicHoliday` types
- `frontend-next/src/components/layouts/sidebar.tsx` — add Holiday and Leave nav items under admin section

### Data Flow

1. Admin adds public holidays for the year via `/admin/holidays`
2. Worker clicks "+ New Week" → backend creates timesheet + 7 entries; any dates matching `public_holidays` are pre-set to `Holiday`
3. Worker opens draft timesheet → sees "Copy last week" button; clicking calls `POST /api/timesheets/:id/copy-last-week`; backend finds previous week's timesheet, copies non-holiday entries into current draft
4. Worker views dashboard → `GET /api/timesheets/leave-balance?year=2026` returns allocated/used/remaining; shown as a small stat card

### Error Handling

- Copy last week with no previous timesheet: return 404; frontend shows "No previous week found"
- Copy last week on a non-draft timesheet: return 409 "Cannot copy into a submitted timesheet"
- Leave balance not set for a year: return `allocated_days: 0` with a note, not an error
- Holiday date conflict (duplicate): return 409 "A holiday already exists for this date"

### Dependencies

- None (independent of 003)

---

## Tasks

| #   | Task                                                           | Acceptance Criteria                                                                                                                                 | Status  |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Add `leave_balances` and `public_holidays` tables to DB schema | Tables created on startup; `public_holidays.date` unique; `leave_balances` unique on `(user_id, year)`                                              | pending |
| 2   | Backend: public holiday pre-fill on timesheet creation         | `POST /api/timesheets` checks holidays for the week and pre-sets matching entries to `work_type='Holiday'`, `is_present=false`                      | pending |
| 3   | Backend: copy-last-week endpoint                               | `POST /api/timesheets/:id/copy-last-week` finds prior week timesheet, copies entries into current draft; blocked on non-draft; 404 if no prior week | pending |
| 4   | Backend: leave balance endpoints (worker + admin)              | Worker can `GET` their balance (allocated from DB, used counted from Leave entries); admin can set allocated days per worker per year               | pending |
| 5   | Backend: admin holiday CRUD endpoints                          | Admin can list, create, delete public holidays; duplicate date returns 409                                                                          | pending |
| 6   | Frontend: admin holiday management page (`/admin/holidays`)    | Admin sees list of holidays, can add (date + name) and delete; changes reflect immediately on new timesheets                                        | pending |
| 7   | Frontend: admin leave balance management page (`/admin/leave`) | Admin can select worker + year and set allocated days; table shows all workers with their current year's allocation                                 | pending |
| 8   | Frontend: leave balance widget on worker dashboard             | Small stat card shows "Leave: X used / Y allocated (Z remaining)" for current year                                                                  | pending |
| 9   | Frontend: "Copy last week" button on weekly timesheet          | Button visible on draft timesheets; clicking copies prior week entries; success shows filled form; "No previous week" toast if none exists          | pending |
