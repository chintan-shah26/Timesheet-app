# Feature Spec: Sidebar UI Redesign

**Feature #**: 002
**Status**: specifying
**Date**: 2026-04-04

## Overview

### What

Replace the current top horizontal NavBar with a GIPS console-style layout: fixed left sidebar with icons and nav labels, a slim top header bar with breadcrumb and user info, and a light-gray content area. The overall aesthetic matches `console.gips.rubrik.com` — clean, minimal, professional.

### Why

The current top-nav layout feels like a generic app. The GIPS console sidebar pattern is more scalable (handles more nav items), more professional, and aligns with the internal tooling the team uses daily.

### Success Criteria

- Fixed left sidebar (~220px) visible on all authenticated pages
- Sidebar shows: app logo at top, nav items with icons + labels, user name + sign-out at bottom
- Active nav item highlighted with teal left accent bar and teal text
- Top header bar shows breadcrumb (current page name) on the left, user avatar initial on the right
- Main content area has a light-gray background (`surface`) distinct from the white sidebar
- All existing pages (dashboard, timesheets, admin review, reports, users) render correctly inside the new layout
- No regression in auth-gate redirect behavior

### Out of Scope

- Mobile/responsive sidebar (hamburger menu) — desktop-only for now
- "Ask Assistant" or other header widgets beyond breadcrumb + user
- Dark mode sidebar (existing dark mode tokens remain, sidebar adapts automatically)
- Any changes to page content, data, or API behavior

## Approach

### Technical Design

The layout switch is entirely in `(protected)/layout.tsx` and new layout components. No page content changes needed.

Current layout (flex-col):

```
<header> NavBar (top) </header>
<main> page content </main>
```

New layout (flex-row):

```
<aside> Sidebar (left, fixed) </aside>
<div class="flex-col flex-1">
  <TopBar (breadcrumb + user) />
  <main> page content </main>
</div>
```

Icon library: add `lucide-react` (tree-shakeable, TypeScript-first, matches GIPS console icon style).

### Components

**New — `components/layouts/sidebar.tsx`**

- Fixed left sidebar, full viewport height
- Logo section: clipboard icon + "TimeSheet" wordmark
- Nav section: role-based links with lucide icon + label
  - Worker: `LayoutDashboard` → "My Timesheets"
  - Admin: `ClipboardCheck` → "Review", `BarChart2` → "Reports", `Users` → "Users"
- Active state: `border-l-2 border-accent bg-accent-subtle text-accent`
- Inactive state: `text-text-secondary hover:bg-surface hover:text-text-primary`
- Bottom: user avatar (initials circle) + name + `LogOut` icon button

**New — `components/layouts/top-bar.tsx`**

- Slim bar (h-12) with left border-b
- Left: current page breadcrumb derived from pathname
- Right: user initials avatar (teal circle)

**Modify — `app/(protected)/layout.tsx`**

- Replace vertical NavBar layout with horizontal split: Sidebar + right column (TopBar + main)
- Main content: `bg-surface` background, `flex-1 overflow-y-auto`

**Delete — `components/layouts/nav-bar.tsx`**

- Fully replaced by Sidebar + TopBar

### Data Flow

No API changes. Auth state (`useAuth`) consumed by Sidebar and TopBar directly — same as current NavBar.

### Error Handling

No new error states. Sidebar renders `null` if `user` is null (same guard as current NavBar).

### Dependencies

- `lucide-react` — add to `frontend-next/package.json`

## Tasks

| #   | Task                               | Acceptance Criteria                                                                                           | Status  |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Install lucide-react               | `npm install lucide-react` succeeds; icon imports work in TypeScript                                          | pending |
| 2   | Build Sidebar component            | Sidebar renders logo, role-based nav items with icons, active state highlight, user name + sign-out at bottom | pending |
| 3   | Build TopBar component             | TopBar renders breadcrumb from pathname on left, user initials avatar on right                                | pending |
| 4   | Update (protected)/layout.tsx      | Layout switches to flex-row with Sidebar on left, TopBar + main on right; `bg-surface` on content area        | pending |
| 5   | Delete NavBar and verify all pages | nav-bar.tsx removed; all authenticated pages render correctly with no console errors                          | pending |
