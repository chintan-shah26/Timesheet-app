# Feature Spec: Admin & Manager Experience

**Feature #**: 005
**Status**: specifying
**Date**: 2026-04-04

## Overview

### What

Two improvements to reduce admin toil:

1. **Bulk approve** — admin (or team lead) can select multiple pending timesheets and approve them all in one action
2. **Submission reminders** — automated email reminder sent to workers who have not submitted their timesheet by end of week (Friday EOD)

### Why

Admins currently approve one timesheet at a time. In a large team this is slow and repetitive. Similarly, chasing workers who forget to submit wastes manager time. Bulk approve and automated reminders remove both pain points.

### Success Criteria

- Admin can select any number of pending timesheets via checkboxes and approve all with one click
- Confirmation dialog shows count before bulk action executes
- Each approved timesheet triggers the same logic as single approve (status → approved, invalidate queries)
- A scheduled job runs every Friday at 17:00 (server timezone) and sends a reminder email to every worker whose current week's timesheet is still in `draft` or does not exist
- Reminder email shows worker name, week dates, and a link to their timesheet
- Admin can configure reminder time and toggle reminders on/off per deployment via env vars

### Out of Scope

- Bulk reject (requires per-sheet rejection notes — deferred)
- Slack/in-app notifications — email only for now
- Per-worker reminder opt-out

---

## Approach

### Technical Design

**Bulk approve:**

- New endpoint: `POST /api/admin/timesheets/bulk-approve` with body `{ ids: number[] }`
- Runs each approval in a DB transaction; partial failure rolls back only the failed sheet and continues
- Returns `{ approved: number[], failed: number[] }`

**Reminder emails:**

- Add `nodemailer` to backend dependencies (SMTP-based)
- New env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `REMINDER_ENABLED` (default `true`), `REMINDER_CRON` (default `0 17 * * 5` — Friday 17:00)
- New module `backend/src/jobs/reminder.js` — queries workers missing current-week submission, sends email per worker
- Scheduler: use `node-cron` package to run the job on the configured schedule
- Job registered in `backend/src/index.js` on startup (only when `REMINDER_ENABLED=true`)

**Email template:**

- Plain-text + HTML email: "Hi [Name], your timesheet for [Mon–Sun] hasn't been submitted yet. Please log in and submit it."
- Link: `${FRONTEND_URL}/timesheets/[id]` if draft exists, else `${FRONTEND_URL}` for dashboard

### Components

- `backend/src/routes/admin.js` — add `POST /bulk-approve` route
- `backend/src/jobs/reminder.js` — new reminder job module
- `backend/src/index.js` — register cron job on startup
- `backend/package.json` — add `nodemailer`, `node-cron`
- `frontend-next/src/app/(protected)/admin/page.tsx` — add row checkboxes + bulk approve toolbar
- `frontend-next/src/api/admin.ts` — add `bulkApproveTimesheets(ids: number[])`
- `frontend-next/src/types/index.ts` — add `BulkApproveResult` type

### Data Flow

**Bulk approve:**

1. Admin checks rows in the timesheet table → selected IDs stored in local state
2. Bulk action toolbar appears showing count → "Approve X timesheets" button
3. Confirmation modal → admin confirms
4. `POST /api/admin/timesheets/bulk-approve` with `{ ids }` → backend processes each
5. Response shows approved/failed counts → TanStack Query cache invalidated → table refreshes

**Reminder job:**

1. `node-cron` fires at configured time (default Friday 17:00)
2. `reminder.js` queries: workers whose current week has no timesheet OR timesheet status is `draft`
3. For each worker, sends reminder email via nodemailer
4. Errors per worker are logged (Sentry + console) but do not abort remaining emails

### Error Handling

- Bulk approve with empty `ids`: return 400
- Individual sheet already approved/rejected in bulk run: skip silently, include in `approved` count
- SMTP failure: log error + Sentry, do not crash the server
- `REMINDER_ENABLED=false`: skip cron registration entirely

### Dependencies

- 003 (teams) — bulk approve toolbar should respect team_lead scope (only shows their team's sheets)

---

## Tasks

| #   | Task                                                             | Acceptance Criteria                                                                                                                                | Status  |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Backend: bulk approve endpoint                                   | `POST /api/admin/timesheets/bulk-approve` accepts `{ ids }`, approves each in a transaction, returns `{ approved, failed }`; empty ids → 400       | pending |
| 2   | Frontend: row checkboxes + bulk toolbar on admin timesheet table | Checkboxes appear on each pending row; selecting any shows toolbar with "Approve X timesheets" button; deselect all hides toolbar                  | pending |
| 3   | Frontend: bulk approve confirmation modal + execution            | Modal shows count; confirm calls `bulkApproveTimesheets`; success toast shows "X timesheets approved"; table refreshes                             | pending |
| 4   | Backend: add nodemailer + node-cron; reminder job module         | `reminder.js` queries un-submitted workers for current week and sends email to each; SMTP config from env vars                                     | pending |
| 5   | Backend: register cron job on startup                            | Job runs on `REMINDER_CRON` schedule when `REMINDER_ENABLED=true`; skipped when false; SMTP errors logged but non-fatal                            | pending |
| 6   | Backend .env.example: document new SMTP + reminder env vars      | `.env.example` updated with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `REMINDER_ENABLED`, `REMINDER_CRON` with descriptions | pending |
