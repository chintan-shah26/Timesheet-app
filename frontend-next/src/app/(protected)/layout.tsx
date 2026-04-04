"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/layouts/sidebar";
import TopBar from "@/components/layouts/top-bar";
import AuthGate from "@/components/common/auth-gate";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-surface px-8 py-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
