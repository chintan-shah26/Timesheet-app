"use client";

import type { ReactNode } from "react";
import AuthGate from "@/components/common/auth-gate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AuthGate adminOnly>{children}</AuthGate>;
}
