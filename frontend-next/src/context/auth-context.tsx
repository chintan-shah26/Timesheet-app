"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, getNeedsSetup, logout as apiLogout } from "@/api/auth";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  needsSetup: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_QUERY_KEY = ["auth-session"] as const;
const SETUP_QUERY_KEY = ["auth-needs-setup"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [userOverride, setUserOverride] = useState<User | null | undefined>(
    undefined,
  );

  const { data: fetchedUser, isLoading: meLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getMe,
    retry: false,
  });

  const { data: needsSetup = false, isLoading: setupLoading } = useQuery({
    queryKey: SETUP_QUERY_KEY,
    queryFn: getNeedsSetup,
    retry: false,
  });

  const user =
    userOverride !== undefined ? userOverride : (fetchedUser ?? null);
  const loading = meLoading || setupLoading;

  const setUser = useCallback(
    (u: User | null) => {
      setUserOverride(u);
      queryClient.setQueryData(AUTH_QUERY_KEY, u);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    queryClient.clear();
    setUserOverride(null);
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{ user, needsSetup, loading, setUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
