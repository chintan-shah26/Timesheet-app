# Feature Spec: Frontend Standardization

**Feature #**: 001
**Status**: implemented
**Date**: 2026-04-04

## Overview

### What

Migrate the frontend from the current Vite + React (JSX) stack to the GIPS standard stack: Next.js, React, TypeScript, Tailwind CSS, CVA, TanStack Query, React Hook Form, and TanStack Table. The new app lives in `frontend-next/` alongside the existing `frontend/` until all pages are ported, then `frontend/` is decommissioned.

### Why

The current stack has four pain points that the standard stack resolves:

- **No types**: all data shapes and API responses are untyped, making refactors risky
- **Manual data fetching**: every page duplicates `useEffect + useState + loading + error` boilerplate; no caching, no deduplication
- **No form abstractions**: form state, validation, and submission are wired by hand in each page
- **No table abstractions**: sorting, filtering, and pagination logic would need to be re-implemented per table

### Success Criteria

- All existing pages are ported and functionally equivalent to the current app
- No plain `useEffect` calls for data fetching — all server state via TanStack Query
- No manual `useState` chains for form fields — all forms via React Hook Form
- All `<table>` elements backed by TanStack Table column definitions
- All CSS classes replaced with Tailwind utilities; component variants via CVA
- The codebase compiles with `tsc --noEmit` (zero type errors)
- The old `frontend/` directory is removed

### Out of Scope

- Server-side rendering or SSG — the app remains a client-side SPA; `'use client'` is used throughout
- Next.js API routes — the Express backend is unchanged; the frontend talks directly to `http://localhost:3001`
- Adding new features beyond what the current app already does
- Backend changes of any kind

## Approach

### Technical Design

**Next.js as SPA**: Use the App Router with `'use client'` on all interactive components. Route protection is handled by a Next.js middleware (`middleware.ts`) that reads the session cookie and redirects unauthenticated requests. This mirrors the current `ProtectedRoute` pattern without server components.

**Routing mapping**:
| Current (React Router) | Next.js App Router |
|---|---|
| `/login` | `app/login/page.tsx` |
| `/setup` | `app/setup/page.tsx` |
| `/` | `app/page.tsx` (worker dashboard or admin redirect) |
| `/timesheets/:id` | `app/timesheets/[id]/page.tsx` |
| `/admin` | `app/admin/page.tsx` |
| `/admin/reports` | `app/admin/reports/page.tsx` |
| `/admin/users` | `app/admin/users/page.tsx` |

**Auth**: `AuthContext` moves to a React context provider in `app/layout.tsx`. The middleware protects all routes except `/login` and `/setup`. The existing session cookie mechanism is unchanged.

**TanStack Query**: A `QueryClientProvider` wraps the app in `app/layout.tsx`. All GET calls become `useQuery` hooks in `lib/queries/`. All mutations become `useMutation` hooks. Cache keys follow the pattern `['resource', params]`.

**React Hook Form**: Used for Login, Setup, ManageUsers (create user, reset password), and DayRow fields in WeeklyTimesheet. Validation is inline (no external schema library needed at this scale).

**TanStack Table**: Used for Dashboard timesheet list, AdminDashboard timesheets list, MonthlyReport summary table, and ManageUsers user list.

**Tailwind + CVA**: Replace all CSS classes from `App.css` and page-level `style={{}}` props with Tailwind utilities. CVA defines the variant API for `Button`, `Badge`, `Input`, `Select`, and `Textarea` components. The existing CSS custom properties (accent color `#aa3bff`, dark mode) are mapped to Tailwind CSS variables in `tailwind.config.ts`.

### Components

**New (lib/components/ui/)**:

- `Button` — CVA variants: `primary`, `secondary`, `ghost`, `danger`, `success`; sizes `sm`, `md`
- `Badge` — CVA variants: `draft`, `submitted`, `approved`, `rejected`
- `Card` — wrapper div with Tailwind border + shadow, optional `overflow` prop
- `Input` — typed `<input>` with Tailwind classes, forwarded ref
- `Select` — typed `<select>` with Tailwind classes, forwarded ref
- `Textarea` — typed `<textarea>` with Tailwind classes, forwarded ref
- `Modal` — overlay + dialog with backdrop click dismiss

**Ported components**:

- `NavBar` — port to TypeScript, replace CSS classes with Tailwind, use `usePathname()` instead of `useLocation()`
- `DayRow` — port to TypeScript, wire fields with `useFormContext` (React Hook Form)
- `TimesheetStatusBadge` — replace with `Badge` CVA component

**Pages** (all `'use client'`):

- `Login`, `Setup` — React Hook Form
- `Dashboard` — TanStack Query + TanStack Table
- `WeeklyTimesheet` — TanStack Query, DayRow via React Hook Form array fields
- `AdminDashboard` — TanStack Query + TanStack Table
- `MonthlyReport` — TanStack Query + TanStack Table
- `ManageUsers` — TanStack Query + TanStack Table + React Hook Form

### Data Flow

```
API layer (lib/api/*.ts)  ←→  TanStack Query hooks (lib/queries/*.ts)
                                        ↓
                              Page components (useQuery / useMutation)
                                        ↓
                              UI components (presentational, typed props)
```

The API layer (`lib/api/client.ts`) re-exports the Axios instance with typed response helpers. All endpoint functions live in `lib/api/timesheets.ts`, `lib/api/admin.ts`, `lib/api/auth.ts` — co-located with their query hook files.

### Error Handling

- `useQuery` error state renders an inline error message (no crash)
- `useMutation` `onError` sets React Hook Form `setError` or a local error state
- Network errors surface as toast-style alerts (simple fixed-position div, no library needed)
- TypeScript strict mode catches shape mismatches at compile time

### Dependencies

New packages to install in `frontend-next/`:

```
next react react-dom
typescript @types/react @types/react-dom @types/node
tailwindcss postcss autoprefixer
class-variance-authority clsx tailwind-merge
@tanstack/react-query
react-hook-form
@tanstack/react-table
axios
date-fns
@sentry/nextjs
```

## Tasks

| #   | Task                                                                                                                                                                                                                       | Acceptance Criteria                                                                                                                                               | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Scaffold `frontend-next/` — `create-next-app` with TypeScript, App Router; install and configure Tailwind, CVA, TanStack Query, React Hook Form, TanStack Table, Axios, date-fns, Sentry                                   | `npm run dev` starts on port 5174; `tsc --noEmit` passes; Tailwind classes render; `next.config.ts` points API base to `localhost:3001`                           | done   |
| 2   | Define TypeScript types (`lib/types.ts`) and typed API client (`lib/api/client.ts`) — User, Timesheet, TimesheetEntry, WorkType, Role types; typed Axios instance with `withCredentials`                                   | All API response shapes are typed; client exported; no `any`                                                                                                      | done   |
| 3   | Build auth system — `AuthContext` provider in `app/layout.tsx`, `useAuth` hook, Next.js `middleware.ts` protecting all routes except `/login` and `/setup`; `lib/api/auth.ts` with typed login/logout/me/needs-setup calls | Visiting `/` unauthenticated redirects to `/login`; auth context provides `user`, `setUser`, `logout`                                                             | done   |
| 4   | Build shared UI component library (`lib/components/ui/`) — Button, Badge, Card, Input, Select, Textarea, Modal — all with CVA variants and TypeScript props                                                                | Each component renders correctly; CVA variants match existing CSS class names; `tsc --noEmit` passes                                                              | done   |
| 5   | Port NavBar — TypeScript, Tailwind, `usePathname()` for active link detection                                                                                                                                              | NavBar renders for authenticated users; active link highlighted; role-based nav items correct                                                                     | done   |
| 6   | Port Login and Setup pages with React Hook Form — `app/login/page.tsx`, `app/setup/page.tsx`                                                                                                                               | Login submits credentials, sets auth context, redirects to `/`; Setup creates first admin; validation errors display                                              | done   |
| 7   | Port worker Dashboard (`app/page.tsx`) — TanStack Query for timesheet list, TanStack Table for the table, "New Week" mutation                                                                                              | Timesheets load via `useQuery`; table renders with correct columns; creating a new week navigates to `/timesheets/[id]`; 409 conflict navigates to existing sheet | done   |
| 8   | Port WeeklyTimesheet (`app/timesheets/[id]/page.tsx`) — TanStack Query for sheet fetch, React Hook Form array fields for DayRow entries, save draft / submit / recall mutations                                            | Sheet loads; each DayRow is a controlled form field; save draft, submit, and recall all work; read-only mode for non-draft sheets                                 | done   |
| 9   | Port DayRow component — TypeScript props, React Hook Form `useFormContext` for field registration                                                                                                                          | DayRow registers fields correctly; presence toggle disables hours/type/notes when absent; read-only mode disables all inputs                                      | done   |
| 10  | Port AdminDashboard (`app/admin/page.tsx`) — TanStack Query for timesheets + workers, TanStack Table, approve/reject mutations, month/worker filter                                                                        | Table renders with filters; opening a sheet shows modal with DayRows read-only; approve and reject mutations update table                                         | done   |
| 11  | Port MonthlyReport (`app/admin/reports/page.tsx`) — TanStack Query for on-demand report, TanStack Table for summary and employee views, CSV export, Excel export link                                                      | Report generates on button click; both summary and employee views render in TanStack Table; CSV download works; Excel export navigates to backend URL             | done   |
| 12  | Port ManageUsers (`app/admin/users/page.tsx`) — TanStack Query for user list, TanStack Table, React Hook Form for create user and reset password forms, role change and delete mutations                                   | User list renders; create user form submits and adds row; role change updates row inline; delete confirmation modal works; reset password modal works             | done   |
| 13  | Configure Sentry for Next.js (`@sentry/nextjs`) — `sentry.client.config.ts`, `sentry.server.config.ts`, DSN from env var `NEXT_PUBLIC_SENTRY_DSN`                                                                          | Sentry initialises on app start; errors are captured; no DSN hardcoded                                                                                            | done   |
| 14  | Decommission old Vite frontend — remove `frontend/` directory, update `CLAUDE.md` and `specs/project-spec.md` to reference `frontend-next/` only, update `ecosystem.config.js` if present                                  | `frontend/` is deleted; documentation references updated; app runs entirely from `frontend-next/`                                                                 | done   |
