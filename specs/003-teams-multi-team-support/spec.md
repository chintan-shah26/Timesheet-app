# Feature Spec: Teams & Multi-team Support

**Feature #**: 003
**Status**: specifying
**Date**: 2026-04-04

## Overview

### What

Introduce a `teams` concept that groups workers together. Admins can create and manage teams, assign workers to teams, and designate team leads. Team leads get a scoped admin-like view covering only their team. Reporting gains a team dimension — monthly billing can be filtered and exported per team.

### Why

The app currently has a flat user model (worker | admin) with no concept of teams. As the app scales to multiple teams across an organisation, admins need to delegate review responsibilities to team leads and filter reports by team. Without this, every admin sees all data and no one owns a team's timesheets.

### Success Criteria

- Admin can create, rename, and delete teams
- Admin can assign workers and promote a worker to team lead
- Team lead can view and approve/reject timesheets for their team only
- Monthly report can be filtered by team
- Admin timesheet list can be filtered by team
- A worker can belong to at most one team

### Out of Scope

- Cross-team reporting (comparing teams) — deferred to 006
- Slack/email notifications when team lead is assigned — deferred to 005
- Nested teams / sub-teams

---

## Approach

### Technical Design

**Backend — new tables:**

```sql
teams (id, name, description, created_at)
team_members (team_id, user_id, is_lead, joined_at)
-- user_id is unique across team_members (one team per worker)
```

**New role: `team_lead`**

- Add `team_lead` as a valid role value in `users.role` (`worker` | `team_lead` | `admin`)
- Team lead has access to `/api/admin/timesheets` scoped to their team's user IDs only
- Team lead cannot access user management or reports beyond their team

**API additions:**

- `GET/POST /api/admin/teams` — list / create teams
- `GET/PUT/DELETE /api/admin/teams/:id` — get / update / delete team
- `POST /api/admin/teams/:id/members` — add worker to team, optionally as lead
- `DELETE /api/admin/teams/:id/members/:userId` — remove worker from team
- `GET /api/admin/timesheets` — add optional `team_id` query param
- `GET /api/admin/reports/monthly` — add optional `team_id` query param

**Frontend additions:**

- `/admin/teams` page — team list, create/edit team, assign members, set lead
- Admin timesheet filter gains a "Team" dropdown
- Admin reports filter gains a "Team" dropdown
- Sidebar gains "Teams" nav item (admin only)
- `AuthGate` extended to allow `team_lead` role on admin routes (scoped)

### Components

- `backend/src/routes/teams.js` — new route file
- `backend/src/routes/admin.js` — add `team_id` filter to timesheet + report queries
- `backend/src/db.js` — add `teams` and `team_members` table creation
- `frontend-next/src/app/(protected)/admin/teams/page.tsx` — new page
- `frontend-next/src/api/admin.ts` — add team API functions
- `frontend-next/src/types/index.ts` — add `Team`, `TeamMember` types; extend `User` role
- `frontend-next/src/components/layouts/sidebar.tsx` — add Teams nav item
- `frontend-next/src/components/common/auth-gate.tsx` — allow team_lead on admin routes

### Data Flow

1. Admin creates team → `POST /api/admin/teams`
2. Admin assigns worker → `POST /api/admin/teams/:id/members` (sets `is_lead` flag, optionally promotes role to `team_lead`)
3. Team lead logs in → `useAuth` returns role `team_lead`
4. Team lead's timesheet API calls include implicit `team_id` filter derived server-side from their membership
5. Admin filtering → `team_id` passed as query param to timesheet + report endpoints

### Error Handling

- Delete team: block if team has members — return 409 with message "Remove all members before deleting"
- Assign worker already in another team: return 409 "Worker already belongs to a team"
- Team lead trying to access another team's data: 403 Forbidden
- Demoting the only lead of a team: warn but allow (team can have no lead)

### Dependencies

- None (standalone addition to existing auth and admin routes)

---

## Tasks

| #   | Task                                                                         | Acceptance Criteria                                                                                                                                               | Status |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Add `teams` and `team_members` tables to DB schema                           | Tables created on startup via `db.js`; `team_members.user_id` unique constraint; `users.role` accepts `team_lead`                                                 | done   |
| 2   | Backend: CRUD routes for teams (`/api/admin/teams`)                          | Admin can list, create, update, delete teams; delete blocked if members exist                                                                                     | done   |
| 3   | Backend: team membership routes — add/remove members, set lead               | `POST /members` adds worker and optionally sets `is_lead`; promotes user role to `team_lead`; `DELETE /members/:userId` removes and demotes role back to `worker` | done   |
| 4   | Backend: scope team_lead timesheet access to their team                      | `GET /api/admin/timesheets` for team_lead role filters by their team's user IDs server-side; cannot see other teams                                               | done   |
| 5   | Backend: add `team_id` filter to timesheet list and monthly report endpoints | Both endpoints accept optional `team_id` query param and filter correctly                                                                                         | done   |
| 6   | Frontend: Teams management page (`/admin/teams`)                             | Admin can view teams list, create team, edit name/description, delete team, add/remove members, promote/demote lead                                               | done   |
| 7   | Frontend: add Team filter to admin timesheet list and reports                | Team dropdown appears alongside existing filters; selecting a team filters results                                                                                | done   |
| 8   | Frontend: sidebar Teams nav item + team_lead auth gate                       | "Teams" appears in sidebar for admin; team_lead can access admin timesheet/approval routes but not users or full reports                                          | done   |
