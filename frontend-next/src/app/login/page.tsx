"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { login } from "@/api/auth";
import Button from "@/components/common/button";
import Input from "@/components/common/input";
import Card from "@/components/common/card";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { user, needsSetup, loading, setUser } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  useEffect(() => {
    if (!loading && user) router.replace("/");
    if (!loading && needsSetup) router.replace("/setup");
  }, [user, needsSetup, loading, router]);

  const onSubmit = async ({ email, password }: LoginForm) => {
    try {
      const me = await login(email, password);
      setUser(me);
      router.replace("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Login failed";
      setError("root", { message: msg });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-6 text-center">
        <p className="text-2xl">📋</p>
        <h1 className="mt-2 text-xl font-semibold text-text-primary">
          TimeSheet
        </h1>
        <p className="text-sm text-text-secondary">
          Track weekly attendance and billing
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-text-primary">
          Sign in to your account
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoFocus
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-danger">
                {errors.password.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
