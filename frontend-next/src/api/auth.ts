import apiClient from "@/config/api-client";
import type { User } from "@/types";

export async function getMe(): Promise<User | null> {
  return apiClient
    .get<User>("/api/auth/me")
    .then((r) => r.data)
    .catch(() => null);
}

export async function getNeedsSetup(): Promise<boolean> {
  return apiClient
    .get<{ needsSetup: boolean }>("/api/auth/needs-setup")
    .then((r) => r.data.needsSetup)
    .catch(() => false);
}

export async function login(email: string, password: string): Promise<User> {
  const r = await apiClient.post<User>("/api/auth/login", { email, password });
  return r.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/auth/logout");
}

export async function setup(
  email: string,
  name: string,
  password: string,
): Promise<User> {
  const r = await apiClient.post<User>("/api/auth/setup", {
    email,
    name,
    password,
  });
  return r.data;
}
