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
  ScrollText,
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
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
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
        {/* Rubrik logo mark — official paths */}
        <svg
          width="26"
          height="27"
          viewBox="0 0 36 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Rubrik"
        >
          <g fill="#070F52" fillRule="evenodd" clipRule="evenodd">
            <path d="M17.114 1.096a.747.747 0 0 0-.285.186l-4.755 4.985a.815.815 0 0 0 0 1.112l4.755 4.985a.729.729 0 0 0 1.062 0l4.753-4.985a.816.816 0 0 0 0-1.112l-4.753-4.985a.743.743 0 0 0-.283-.186h-.494z" />
            <path d="M28.685 13.714 23.93 18.7a.816.816 0 0 0 0 1.112l4.756 4.985a.728.728 0 0 0 1.06 0l4.754-4.985a.816.816 0 0 0 0-1.112l-4.753-4.985a.728.728 0 0 0-1.06 0z" />
            <path d="m10.88 32.37-2.113 2.217c-.292.305-.233.724.13.928l1.82.904c.382.166.694-.053.694-.485v-3.333c0-.265-.09-.406-.226-.406-.086 0-.19.057-.305.175z" />
            <path d="M23.306 32.601v3.333c0 .432.311.65.693.485l1.82-.904c.364-.204.423-.623.131-.928l-2.114-2.217c-.113-.118-.219-.175-.305-.175-.136 0-.225.141-.225.406z" />
            <path d="M24.056 25.493c-.412 0-.75.353-.75.785v4.496c0 .432.338.787.75.787h4.285c.412 0 .75-.355.75-.787v-4.496c0-.432-.338-.785-.75-.785h-4.285z" />
            <path d="m31.978 10.246-2.113 2.218c-.292.307-.193.558.22.558h3.178c.412 0 .62-.328.462-.729l-.862-1.91c-.111-.219-.29-.332-.476-.332a.57.57 0 0 0-.409.195z" />
            <path d="M23.306 2.576V5.91c0 .433.238.537.53.23l2.114-2.216c.292-.305.232-.724-.13-.928l-1.821-.903a.614.614 0 0 0-.247-.056c-.26 0-.446.207-.446.54z" />
            <path d="m1.853 10.382-.86 1.913c-.159.4.049.727.461.727h3.18c.412 0 .51-.25.219-.558l-2.114-2.218a.569.569 0 0 0-.41-.195c-.185 0-.364.113-.476.331z" />
            <path d="M6.375 6.95c-.412 0-.75.354-.75.787v4.494c0 .433.338.787.75.787h4.286c.412 0 .75-.354.75-.787V7.737c0-.433-.338-.787-.75-.787H6.375z" />
            <path d="m10.717 2.092-1.82.903c-.363.204-.422.623-.13.928l2.114 2.217c.291.306.53.202.53-.23V2.575c0-.333-.186-.54-.447-.54a.62.62 0 0 0-.247.056z" />
            <path d="M30.084 25.493c-.412 0-.51.25-.22.556l2.114 2.22c.292.306.69.243.885-.138l.862-1.912c.158-.399-.05-.726-.462-.726h-3.179z" />
            <path d="M6.375 25.493c-.412 0-.75.353-.75.785v4.496c0 .432.338.786.75.786h4.286c.412 0 .75-.354.75-.786v-4.496c0-.432-.338-.785-.75-.785H6.375z" />
            <path d="M1.454 25.493c-.412 0-.62.326-.462.726l.861 1.912c.196.38.594.444.886.137l2.114-2.22c.292-.305.193-.555-.22-.555H1.454z" />
            <path d="M24.056 6.95c-.412 0-.75.354-.75.787v4.494c0 .433.338.787.75.787h4.285c.412 0 .75-.354.75-.787V7.737c0-.433-.338-.787-.75-.787h-4.285z" />
            <path d="m16.83 26.177-4.756 4.985a.815.815 0 0 0 0 1.112l4.755 4.984c.067.07.143.123.223.16h.617a.75.75 0 0 0 .222-.16l4.753-4.984a.817.817 0 0 0 0-1.112l-4.753-4.985a.73.73 0 0 0-1.061 0z" />
            <path d="M4.975 13.714.22 18.7a.816.816 0 0 0 0 1.112l4.756 4.985a.728.728 0 0 0 1.061 0l4.753-4.985a.817.817 0 0 0 0-1.112l-4.753-4.985a.729.729 0 0 0-1.06 0z" />
          </g>
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
