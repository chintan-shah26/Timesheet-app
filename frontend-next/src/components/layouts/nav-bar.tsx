"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import Button from "@/components/common/button";

export default function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isActive = (path: string) => pathname === path;

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`text-[13px] font-medium uppercase tracking-wide transition-colors ${
        isActive(href)
          ? "text-accent"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
        <span className="text-sm font-semibold text-text-primary">
          TimeSheet
        </span>

        <nav className="flex items-center gap-6">
          {user.role === "admin" ? (
            <>
              {navLink("/admin", "Review")}
              {navLink("/admin/reports", "Reports")}
              {navLink("/admin/users", "Users")}
            </>
          ) : (
            navLink("/", "My Timesheets")
          )}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">{user.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
