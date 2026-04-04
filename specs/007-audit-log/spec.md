# Feature Spec: Platform & Governance

**Feature #**: 007
**Status**: specifying
**Date**: 2026-04-04

## Overview

### What

An **audit log** that records every significant action taken on timesheets and users — approvals, rejections, submissions, recalls, password resets, role changes, and user deletions. Admins can view the full log with filters by actor, target user, action type, and date range.

### Why

As the app scales to multiple teams, accountability becomes critical. When a timesheet is disputed or a user account change is questioned, there is currently no way to know who did what and when. An audit log provides a tamper-evident trail for compliance and incident investigation.

### Success Criteria

- Every approve, reject, submit, recall, create user, delete user, role change, and password reset is recorded with: actor (who), action type, target (timesheet or user), timestamp, and optional metadata (e.g. rejection note)
- Audit log is append-only — no update or delete on audit records
- Admin can view the audit log page with filters: actor, action type, date range, target user
- Log entries are paginated (50 per page)
- Audit records are written inside the same DB transaction as the action they record — no orphaned records

### Out of Scope

- Worker-visible audit log (workers cannot see the log)
- Exporting audit log to CSV/Excel — deferred
- Login/logout events — deferred
- Immutable storage (e.g. write to S3) — deferred

---

## Approach

### Technical Design

**New table:**

```sql
audit_logs (
  id          SERIAL PRIMARY KEY,
  actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT,          -- denormalised snapshot in case user is later deleted
  action      TEXT NOT NULL, -- enum: approve, reject, submit, recall, create_user,
                              --       delete_user, change_role, reset_password
  target_type TEXT NOT NULL, -- 'timesheet' | 'user'
  target_id   INTEGER,
  target_name TEXT,          -- denormalised snapshot
  metadata    JSONB,         -- e.g. { rejection_note, old_role, new_role }
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

**Audit helper:**

- `backend/src/audit.js` — `logAction(db, { actorId, actorName, action, targetType, targetId, targetName, metadata })` — inserts a record; called inside existing route transactions

**API:**

- `GET /api/admin/audit?action=&actor_id=&target_user_id=&from=&to=&page=` — paginated audit log; admin only
- Returns `{ data: AuditLog[], total: number, page: number, pageSize: number }`

**Integration points** — add `logAction` call to:

- `routes/admin.js`: approve, reject, create_user, delete_user, change_role, reset_password
- `routes/timesheets.js`: submit, recall

### Components

- `backend/src/db.js` — add `audit_logs` table
- `backend/src/audit.js` — new `logAction` helper
- `backend/src/routes/admin.js` — call `logAction` in approve, reject, user management routes
- `backend/src/routes/timesheets.js` — call `logAction` in submit, recall routes
- `frontend-next/src/app/(protected)/admin/audit/page.tsx` — new audit log page
- `frontend-next/src/api/admin.ts` — add `getAuditLog(params)`
- `frontend-next/src/types/index.ts` — add `AuditLog`, `AuditAction` types
- `frontend-next/src/components/layouts/sidebar.tsx` — add "Audit Log" nav item (admin only)

### Data Flow

1. Admin approves timesheet → `approveTimesheet` route runs DB update + `logAction` in same transaction
2. Transaction commits → audit record persisted atomically
3. Admin opens `/admin/audit` → `GET /api/admin/audit` with filter params
4. Paginated table shows: timestamp, actor, action badge, target, metadata snippet

### Error Handling

- `logAction` failure inside a transaction: the transaction rolls back — the action and the log entry are both undone (atomicity guaranteed)
- Deleted actor: `actor_id` set to NULL, `actor_name` preserves the snapshot
- Invalid filter params: ignore unknown params, return unfiltered results with a warning log

### Dependencies

- None (purely additive — instruments existing routes)

---

## Tasks

| #   | Task                                                                | Acceptance Criteria                                                                                                                | Status  |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Add `audit_logs` table to DB schema                                 | Table created on startup; append-only by convention (no update/delete routes); indexes on `actor_id`, `action`, `created_at`       | pending |
| 2   | Backend: `audit.js` helper module                                   | `logAction(db, params)` inserts a record; accepts a db client (for transaction participation); exported for use in routes          | pending |
| 3   | Backend: instrument admin routes (approve, reject, user management) | `logAction` called inside each action's DB transaction for: approve, reject, create_user, delete_user, change_role, reset_password | pending |
| 4   | Backend: instrument timesheet routes (submit, recall)               | `logAction` called inside submit and recall transactions                                                                           | pending |
| 5   | Backend: audit log query endpoint                                   | `GET /api/admin/audit` returns paginated results with filters: `action`, `actor_id`, `target_user_id`, `from`, `to`, `page`        | pending |
| 6   | Frontend: audit log page (`/admin/audit`)                           | Paginated table showing timestamp, actor, action badge (colour-coded), target, metadata; filter bar for action type + date range   | pending |
| 7   | Frontend: sidebar "Audit Log" nav item                              | Appears under admin section; links to `/admin/audit`                                                                               | pending |
