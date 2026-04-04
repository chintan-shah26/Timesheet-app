"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface AuthGateProps {
  children: ReactNode;
  adminOnly?: boolean;
  /** Allow team_lead role in addition to admin for adminOnly routes */
  allowTeamLead?: boolean;
}

/**
 * Client-side route guard. Redirects unauthenticated users to /login.
 * Redirects non-admins away from adminOnly routes.
 * Pass allowTeamLead to also permit the team_lead role on a specific route.
 */
export default function AuthGate({
  children,
  adminOnly = false,
  allowTeamLead = false,
}: AuthGateProps) {
  const { user, loading, needsSetup } = useAuth();
  const router = useRouter();

  const isAllowed = (role: string) => {
    if (!adminOnly) return true;
    if (role === "admin") return true;
    if (allowTeamLead && role === "team_lead") return true;
    return false;
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(needsSetup ? "/setup" : "/login");
      return;
    }
    const allowed =
      !adminOnly ||
      user.role === "admin" ||
      (allowTeamLead && user.role === "team_lead");
    if (!allowed) router.replace("/");
  }, [user, loading, needsSetup, adminOnly, allowTeamLead, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return null;
  if (!isAllowed(user.role)) return null;

  return <>{children}</>;
}
