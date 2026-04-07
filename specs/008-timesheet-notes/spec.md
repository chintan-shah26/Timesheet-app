# 008 · Timesheet-Level Notes

## Overview

Workers can add a free-text note to an entire timesheet (e.g. "Was on client site all week", "Had a team offsite Mon–Wed"). The note is distinct from the per-entry `notes` field and from the admin's `admin_note`. It is editable only while the timesheet is in `draft` status and is visible to admins during review.

## Approach

Add a nullable `notes` column to the `timesheets` table. Expose it via the existing `GET /api/timesheets/:id` and list endpoints. Accept it on `PUT /api/timesheets/:id/entries` (the existing draft-save endpoint — avoids a new round-trip). On the frontend, render a `<Textarea>` below the day-entry table on the weekly timesheet page; include the value in the existing `saveEntries` mutation payload shape by extending the save call. Display the notes field (read-only) in the admin timesheet detail view.

## Tasks

- [ ] **DB migration** — add `notes TEXT NULL` column to `timesheets` table
- [ ] **Backend: expose notes on read endpoints** — include `notes` in `GET /api/timesheets` list query and `GET /api/timesheets/:id` response
- [ ] **Backend: accept notes on save** — extend `PUT /api/timesheets/:id/entries` to accept and persist an optional top-level `notes` field (draft-only, same guard as entries)
- [ ] **Frontend types** — add `notes?: string | null` to `Timesheet` and `TimesheetSummary` in `types/index.ts`
- [ ] **Frontend API** — extend `saveEntries(id, entries, notes?)` in `api/timesheets.ts` to pass `notes` in the request body
- [ ] **Frontend UI (worker)** — add a `<Textarea>` labeled "Week notes" below the day-entry table on the weekly timesheet page; controlled via React Hook Form; disabled when status ≠ `draft`; saved on the existing submit/save action
- [ ] **Frontend UI (admin)** — display the notes field (read-only) in the admin timesheet detail view if non-empty
