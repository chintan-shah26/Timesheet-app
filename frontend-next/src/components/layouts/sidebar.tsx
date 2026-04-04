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
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/auth-context";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const workerNav: NavItem[] = [
  {
    href: "/",
    label: "My Timesheets",
    icon: <LayoutDashboard size={16} />,
  },
];

const adminNav: NavItem[] = [
  {
    href: "/admin",
    label: "Review",
    icon: <ClipboardCheck size={16} />,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: <BarChart2 size={16} />,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: <Users size={16} />,
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navItems = user.role === "admin" ? adminNav : workerNav;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-background">
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
                ? "bg-accent-subtle text-accent"
                : "text-text-secondary hover:bg-surface hover:text-text-primary",
            )}
          >
            <span
              className={clsx(
                isActive(item.href) ? "text-accent" : "text-text-disabled",
              )}
            >
              {item.icon}
            </span>
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
            onClick={logout}
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
