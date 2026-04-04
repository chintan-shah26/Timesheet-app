"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart2,
  Users,
  UsersRound,
  CalendarDays,
  Umbrella,
  Settings,
  LogOut,
  type LucideProps,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/auth-context";
import { getInitials } from "@/lib/initials";

type IconComponent = React.FC<LucideProps>;

interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
}

const workerNav: NavItem[] = [
  { href: "/", label: "My Timesheets", icon: LayoutDashboard },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Review", icon: ClipboardCheck },
  { href: "/admin/reports", label: "Reports", icon: BarChart2 },
  { href: "/admin/teams", label: "Teams", icon: UsersRound },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/holidays", label: "Holidays", icon: CalendarDays },
  { href: "/admin/leave", label: "Leave", icon: Umbrella },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const teamLeadNav: NavItem[] = [
  { href: "/admin", label: "Review", icon: ClipboardCheck },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navItems =
    user.role === "admin"
      ? adminNav
      : user.role === "team_lead"
        ? teamLeadNav
        : workerNav;

  // Exact match only — prevents /admin highlighting while on /admin/reports
  const isActive = (href: string) => pathname === href;

  const initials = getInitials(user.name);

  return (
    <aside className="flex h-screen w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-label="Rubrik"
        >
          <circle cx="12" cy="12" r="11" fill="#009e94" />
          {/* Snowflake arms */}
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const r = (deg * Math.PI) / 180;
            const x1 = 12 + 4.5 * Math.cos(r);
            const y1 = 12 + 4.5 * Math.sin(r);
            const x2 = 12 + 8.5 * Math.cos(r);
            const y2 = 12 + 8.5 * Math.sin(r);
            const cx1 = 12 + 6.5 * Math.cos(r) + 2 * Math.cos(r + Math.PI / 2);
            const cy1 = 12 + 6.5 * Math.sin(r) + 2 * Math.sin(r + Math.PI / 2);
            const cx2 = 12 + 6.5 * Math.cos(r) - 2 * Math.cos(r + Math.PI / 2);
            const cy2 = 12 + 6.5 * Math.sin(r) - 2 * Math.sin(r + Math.PI / 2);
            return (
              <g key={deg}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1={cx1}
                  y1={cy1}
                  x2={cx2}
                  y2={cy2}
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
        <div className="flex items-baseline gap-1">
          <span className="text-[13px] font-bold text-text-primary">
            rubrik
          </span>
          <span className="text-[11px] text-text-disabled">|</span>
          <span className="text-[12px] font-medium text-text-secondary">
            GIPS Timesheet
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
              isActive(item.href)
                ? "border-l-2 border-accent bg-accent-subtle text-accent"
                : "border-l-2 border-transparent text-text-secondary hover:bg-surface hover:text-text-primary",
            )}
          >
            <item.icon
              size={16}
              className={
                isActive(item.href) ? "text-accent" : "text-text-disabled"
              }
            />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User + sign out */}
      <div className="border-t border-border px-3 py-4">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
            {initials}
          </div>
          <span className="flex-1 truncate text-[13px] font-medium text-text-primary">
            {user.name}
          </span>
          <button
            onClick={() => void logout()}
            className="text-text-disabled transition-colors hover:text-danger"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
