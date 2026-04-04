"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart2,
  Users,
  LogOut,
  Clock,
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
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navItems = user.role === "admin" ? adminNav : workerNav;

  // Exact match only — prevents /admin highlighting while on /admin/reports
  const isActive = (href: string) => pathname === href;

  const initials = getInitials(user.name);

  return (
    <aside className="flex h-screen w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
          <Clock size={14} className="text-white" />
        </div>
        <span className="text-[15px] font-semibold text-text-primary">
          TimeSheet
        </span>
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
