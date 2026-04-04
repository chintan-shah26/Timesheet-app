"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { setup } from "@/api/auth";
import Button from "@/components/common/button";
import Input from "@/components/common/input";
import Card from "@/components/common/card";

interface SetupForm {
  name: string;
  email: string;
  password: string;
}

export default function SetupPage() {
  const { user, needsSetup, loading, setUser } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetupForm>();

  useEffect(() => {
    if (!loading && user) router.replace("/");
    if (!loading && !needsSetup) router.replace("/login");
  }, [user, needsSetup, loading, router]);

  const onSubmit = async ({ name, email, password }: SetupForm) => {
    try {
      const me = await setup(email, name, password);
      setUser(me);
      router.replace("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Setup failed";
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
        <p className="text-sm text-text-secondary">Create your admin account</p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-text-primary">
          First-time setup
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Full name
            </label>
            <Input
              placeholder="Jane Smith"
              autoFocus
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Email
            </label>
            <Input
              type="text"
              placeholder="admin@example.com"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Password
            </label>
            <Input
              type="password"
              placeholder="min. 8 characters"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Minimum 8 characters" },
              })}
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
            {isSubmitting ? "Creating account…" : "Create admin account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
