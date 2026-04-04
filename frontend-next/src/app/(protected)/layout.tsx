"use client";

import type { ReactNode } from "react";
import NavBar from "@/components/layouts/nav-bar";
import AuthGate from "@/components/common/auth-gate";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col bg-background">
        <NavBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-6">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
