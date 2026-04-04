"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface AuthGateProps {
  children: ReactNode;
  adminOnly?: boolean;
}

/**
 * Client-side route guard. Redirects unauthenticated users to /login.
 * Redirects non-admins away from adminOnly routes.
 */
export default function AuthGate({
  children,
  adminOnly = false,
}: AuthGateProps) {
  const { user, loading, needsSetup } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(needsSetup ? "/setup" : "/login");
      return;
    }
    if (adminOnly && user.role !== "admin" && user.role !== "team_lead") {
      router.replace("/");
    }
  }, [user, loading, needsSetup, adminOnly, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return null;
  if (adminOnly && user.role !== "admin" && user.role !== "team_lead")
    return null;

  return <>{children}</>;
}
