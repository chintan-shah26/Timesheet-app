"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  getUsers,
  createUser,
  changeUserRole,
  resetUserPassword,
  deleteUser,
} from "@/api/admin";
import { useAuth } from "@/context/auth-context";
import AuthGate from "@/components/common/auth-gate";
import Badge from "@/components/common/badge";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import Input from "@/components/common/input";
import Modal from "@/components/common/modal";
import Select from "@/components/common/select";
import type { User, Role } from "@/types";

const QUERY_KEYS = { users: ["admin-users"] as const };

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface ResetPasswordForm {
  password: string;
}

export default function ManageUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: getUsers,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });

  // Create user form
  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    setError: setCreateError,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<CreateUserForm>({ defaultValues: { role: "worker" } });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void invalidate();
      resetCreate();
      setShowCreateForm(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to create user";
      setCreateError("root", { message: msg });
    },
  });

  // Role change
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) =>
      changeUserRole(id, role),
    onSuccess: () => void invalidate(),
    onError: () => alert("Failed to change role. Please try again."),
  });

  // Reset password form
  const {
    register: regReset,
    handleSubmit: handleReset,
    reset: resetPasswordForm,
    formState: { isSubmitting: isResetting },
  } = useForm<ResetPasswordForm>();

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      resetUserPassword(id, password),
    onSuccess: () => {
      setResetTarget(null);
      resetPasswordForm();
    },
    onError: () => alert("Failed to reset password. Please try again."),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      void invalidate();
      setDeleteTarget(null);
    },
    onError: () => alert("Failed to delete user. Please try again."),
  });

  const columns: ColumnDef<User>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const u = row.original;
        if (u.id === currentUser?.id) {
          return (
            <Badge variant={u.role === "admin" ? "submitted" : "draft"}>
              {u.role} (you)
            </Badge>
          );
        }
        return (
          <Select
            value={u.role}
            onChange={(e) =>
              roleMutation.mutate({ id: u.id, role: e.target.value as Role })
            }
            className="w-auto"
          >
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </Select>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setResetTarget(u);
                resetPasswordForm();
              }}
            >
              Reset password
            </Button>
            {u.id !== currentUser?.id && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteTarget(u)}
              >
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <AuthGate adminOnly>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Manage Users
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Add, edit, and remove team members
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateForm((v) => !v)}
            variant={showCreateForm ? "secondary" : "primary"}
          >
            {showCreateForm ? "Cancel" : "+ New User"}
          </Button>
        </div>

        {/* Create user form */}
        {showCreateForm && (
          <Card className="mb-6 p-6">
            <h2 className="mb-4 text-[15px] font-semibold text-text-primary">
              Create user account
            </h2>
            <form
              onSubmit={handleCreate((data) => createMutation.mutate(data))}
            >
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Full name
                  </label>
                  <Input
                    placeholder="Jane Smith"
                    {...regCreate("name", { required: "Required" })}
                  />
                  {createErrors.name && (
                    <p className="mt-1 text-xs text-danger">
                      {createErrors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Email
                  </label>
                  <Input
                    placeholder="jane@example.com"
                    {...regCreate("email", { required: "Required" })}
                  />
                  {createErrors.email && (
                    <p className="mt-1 text-xs text-danger">
                      {createErrors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="min. 8 chars"
                    {...regCreate("password", {
                      required: "Required",
                      minLength: { value: 8, message: "Minimum 8 characters" },
                    })}
                  />
                  {createErrors.password && (
                    <p className="mt-1 text-xs text-danger">
                      {createErrors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Role
                  </label>
                  <Select {...regCreate("role")} className="w-full">
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
              </div>
              {createErrors.root && (
                <p className="mb-3 rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {createErrors.root.message}
                </p>
              )}
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating…" : "Create user"}
              </Button>
            </form>
          </Card>
        )}

        {/* Users table */}
        <Card overflow>
          {users.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-2xl">👥</p>
              <p className="mt-2 text-sm text-text-secondary">No users yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-border">
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-secondary"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-text-primary">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Delete confirmation modal */}
        {deleteTarget && (
          <Modal onClose={() => setDeleteTarget(null)}>
            <h2 className="mb-2 text-base font-semibold text-text-primary">
              Delete {deleteTarget.name}?
            </h2>
            <p className="mb-5 text-sm text-text-secondary">
              This will permanently remove{" "}
              <strong className="text-text-primary">{deleteTarget.name}</strong>{" "}
              ({deleteTarget.email}) and all their timesheet data. This cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete user"}
              </Button>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
            </div>
          </Modal>
        )}

        {/* Reset password modal */}
        {resetTarget && (
          <Modal onClose={() => setResetTarget(null)}>
            <h2 className="mb-4 text-base font-semibold text-text-primary">
              Reset password — {resetTarget.name}
            </h2>
            <form
              onSubmit={handleReset(({ password }) =>
                resetMutation.mutate({ id: resetTarget.id, password }),
              )}
            >
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  New password
                </label>
                <Input
                  type="password"
                  placeholder="min. 8 characters"
                  autoFocus
                  {...regReset("password", {
                    required: "Required",
                    minLength: { value: 8, message: "Minimum 8 characters" },
                  })}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isResetting}>
                  Save new password
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setResetTarget(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </AuthGate>
  );
}
