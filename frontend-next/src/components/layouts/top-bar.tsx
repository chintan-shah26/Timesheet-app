"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

const BREADCRUMBS: Record<string, string> = {
  "/": "My Timesheets",
  "/admin": "Review",
  "/admin/reports": "Reports",
  "/admin/users": "Users",
};

function getBreadcrumb(pathname: string): string {
  if (BREADCRUMBS[pathname]) return BREADCRUMBS[pathname];
  if (pathname.startsWith("/timesheets/")) return "Timesheet";
  return "TimeSheet";
}

export default function TopBar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <p className="text-[13px] font-medium text-text-secondary">
        {getBreadcrumb(pathname)}
      </p>
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white"
        title={user.name}
      >
        {initials}
      </div>
    </header>
  );
}
