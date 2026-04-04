# Feature Spec: Reporting Enhancements

**Feature #**: 006
**Status**: specifying
**Date**: 2026-04-04

## Overview

### What

Three additions to the reporting layer:

1. **Dashboard charts** — visual attendance and hours trends on the worker dashboard (presence rate per week, hours per week over the last 8 weeks)
2. **Overtime tracking** — flag timesheet entries where hours exceed a configurable threshold (default 8h/day); weekly overtime summary shown on the timesheet and in the monthly report
3. **PDF export** — generate a printable/signable PDF of an individual timesheet (worker or admin can download)

### Why

The current reports are numeric tables only. Charts give workers and admins an at-a-glance view of patterns. Overtime visibility is needed for billing accuracy and compliance. PDF export is required for client sign-off workflows where a digital spreadsheet is not accepted.

### Success Criteria

- Worker dashboard shows a bar/line chart of weekly hours and a presence-rate trend for the last 8 weeks
- Admin dashboard shows team-level weekly hours chart (all workers combined)
- Any timesheet entry with hours > threshold is highlighted; weekly total overtime is shown on the timesheet page
- Monthly report table includes an "Overtime Hours" column per worker
- Worker and admin can download a single timesheet as a formatted PDF
- Overtime threshold is configurable via admin settings (default 8h/day)

### Out of Scope

- Real-time/live charts (static on page load is sufficient)
- Cross-team comparison charts — deferred
- Scheduled PDF delivery via email

---

## Approach

### Technical Design

**Charts:**

- Use `recharts` (lightweight, React-native, no heavy deps) for bar + line charts
- Data sourced from existing `GET /api/timesheets` (worker) and new `GET /api/admin/reports/weekly-summary` endpoint
- `weekly-summary` returns last N weeks of aggregated hours + presence rate per worker (or all workers for admin)

**Overtime tracking:**

- New backend table: `app_settings (key, value, updated_at)` — stores `overtime_threshold_hours` (default `8`)
- Admin can update threshold via `PATCH /api/admin/settings`
- `GET /api/timesheets/:id` response includes `overtime_hours` per entry (hours - threshold if positive, else 0) and `total_overtime` for the week
- Monthly report query also sums overtime hours per worker

**PDF export:**

- Use `pdfkit` on the backend to generate a styled PDF
- New endpoint: `GET /api/timesheets/:id/export/pdf` — streams PDF response
- Admin equivalent: `GET /api/admin/timesheets/:id/export/pdf`
- PDF includes: worker name, week dates, company logo placeholder, daily entries table, totals (present days, total hours, overtime hours), status + approval info

### Components

- `backend/src/db.js` — add `app_settings` table; seed `overtime_threshold_hours = 8`
- `backend/src/routes/timesheets.js` — add overtime fields to timesheet detail response; add PDF export endpoint
- `backend/src/routes/admin.js` — add `GET /reports/weekly-summary`; add overtime column to monthly report; add `GET/PATCH /settings`; add admin PDF export endpoint
- `backend/package.json` — add `recharts` (frontend), `pdfkit` (backend)
- `frontend-next/src/app/(protected)/page.tsx` — worker charts section
- `frontend-next/src/app/(protected)/admin/page.tsx` — admin charts section
- `frontend-next/src/app/(protected)/timesheets/[id]/page.tsx` — overtime highlights + PDF download button
- `frontend-next/src/app/(protected)/admin/page.tsx` — PDF download button in timesheet detail modal
- `frontend-next/src/app/(protected)/admin/settings/page.tsx` — new admin settings page (overtime threshold)
- `frontend-next/src/api/timesheets.ts` — add `getWeeklySummary`, `downloadTimesheetPdf`
- `frontend-next/src/api/admin.ts` — add `getAdminWeeklySummary`, `getSettings`, `updateSettings`
- `frontend-next/src/types/index.ts` — add `WeeklySummary`, `AppSettings`, `OvertimeEntry` types

### Data Flow

**Charts:**

1. Dashboard mounts → `GET /api/admin/reports/weekly-summary?weeks=8` (admin) or worker equivalent
2. Response: `[{ week_start, total_hours, present_days, presence_rate }]`
3. Rendered via `recharts` `BarChart` (hours) + `LineChart` (presence rate)

**Overtime:**

1. Timesheet detail fetched → backend joins entries with threshold from `app_settings`
2. Each entry includes `overtime_hours`; entries with overtime > 0 highlighted in amber on frontend
3. Weekly total overtime shown in summary row

**PDF export:**

1. User clicks "Download PDF" → `GET /api/timesheets/:id/export/pdf`
2. Backend streams `application/pdf` response built with pdfkit
3. Browser triggers file download

### Error Handling

- Weekly summary with no data: return empty array — chart shows empty state message
- PDF for non-existent or unauthorised timesheet: 404 / 403
- pdfkit error: 500 with Sentry capture; do not stream partial PDF
- Settings key not found: seed defaults on startup, never return 404 for known keys

### Dependencies

- 003 (teams) — admin weekly summary should support optional `team_id` filter

---

## Tasks

| #   | Task                                                     | Acceptance Criteria                                                                                                                                        | Status  |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Backend: `app_settings` table + seed overtime threshold  | Table created on startup with `overtime_threshold_hours = 8`; `GET /api/admin/settings` returns all settings; `PATCH` updates a key                        | pending |
| 2   | Backend: overtime fields in timesheet detail response    | `GET /api/timesheets/:id` includes `overtime_hours` per entry and `total_overtime_hours` for the week based on threshold                                   | pending |
| 3   | Backend: overtime column in monthly report               | Monthly report query sums overtime hours per worker; new `overtime_hours` column in response and Excel export                                              | pending |
| 4   | Backend: weekly summary endpoint                         | `GET /api/admin/reports/weekly-summary?weeks=N[&team_id=X]` returns per-week aggregates; worker equivalent at `GET /api/timesheets/weekly-summary`         | pending |
| 5   | Backend: PDF export endpoints (worker + admin)           | `GET /api/timesheets/:id/export/pdf` streams a formatted PDF; admin equivalent at `/api/admin/timesheets/:id/export/pdf`; includes all entry data + totals | pending |
| 6   | Frontend: install recharts; worker dashboard charts      | Bar chart (weekly hours) + line chart (presence rate) for last 8 weeks on worker dashboard; empty state when no data                                       | pending |
| 7   | Frontend: admin dashboard charts                         | Same chart components showing all-workers aggregate; supports team filter if 003 is implemented                                                            | pending |
| 8   | Frontend: overtime highlights on timesheet page          | Entries with overtime > 0 shown with amber background; weekly overtime total displayed in summary                                                          | pending |
| 9   | Frontend: PDF download button on timesheet + admin modal | "Download PDF" button triggers file download; loading state while streaming; error toast on failure                                                        | pending |
| 10  | Frontend: admin settings page (`/admin/settings`)        | Admin can view and update overtime threshold; change takes effect on next timesheet load                                                                   | pending |
