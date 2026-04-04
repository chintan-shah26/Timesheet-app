"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { getAuditLog, getUsers } from "@/api/admin";
import AuthGate from "@/components/common/auth-gate";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import Input from "@/components/common/input";
import Select from "@/components/common/select";
import type { AuditLog, AuditAction } from "@/types";

const ACTION_LABELS: Record<AuditAction, string> = {
  approve: "Approved",
  reject: "Rejected",
  submit: "Submitted",
  recall: "Recalled",
  create_user: "Created User",
  delete_user: "Deleted User",
  change_role: "Changed Role",
  reset_password: "Reset Password",
};

const ACTION_COLORS: Record<AuditAction, string> = {
  approve: "bg-success-subtle text-success",
  reject: "bg-danger-subtle text-danger",
  submit: "bg-accent-subtle text-accent",
  recall: "bg-warning-subtle text-warning",
  create_user: "bg-accent-subtle text-accent",
  delete_user: "bg-danger-subtle text-danger",
  change_role: "bg-warning-subtle text-warning",
  reset_password: "bg-surface text-text-secondary",
};

function ActionBadge({ action }: { action: AuditAction }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[action]}`}
    >
      {ACTION_LABELS[action]}
    </span>
  );
}

function MetadataSnippet({
  metadata,
}: {
  metadata: Record<string, unknown> | null;
}) {
  if (!metadata) return null;
  const entries = Object.entries(metadata).filter(([k]) => k !== "bulk");
  if (entries.length === 0) return null;
  return (
    <span className="text-xs text-text-disabled">
      {entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ")}
    </span>
  );
}

const ALL_ACTIONS: AuditAction[] = [
  "approve",
  "reject",
  "submit",
  "recall",
  "create_user",
  "delete_user",
  "change_role",
  "reset_password",
];

const QUERY_KEYS = {
  audit: (
    action: string,
    actorId: string,
    from: string,
    to: string,
    page: number,
  ) => ["admin-audit", action, actorId, from, to, page] as const,
  workers: ["admin-users"] as const,
};

const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "created_at",
    header: "Time",
    cell: ({ row }) =>
      format(new Date(row.original.created_at), "MMM d, yyyy HH:mm"),
  },
  {
    accessorKey: "actor_name",
    header: "Actor",
    cell: ({ row }) => row.original.actor_name ?? "—",
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => <ActionBadge action={row.original.action} />,
  },
  {
    accessorKey: "target_name",
    header: "Target",
    cell: ({ row }) => (
      <span className="text-sm">
        <span className="mr-1 text-xs text-text-disabled">
          {row.original.target_type}
        </span>
        {row.original.target_name ?? "—"}
      </span>
    ),
  },
  {
    id: "metadata",
    header: "Details",
    cell: ({ row }) => <MetadataSnippet metadata={row.original.metadata} />,
  },
];

export default function AuditLogPage() {
  const [filterAction, setFilterAction] = useState("");
  const [filterActorId, setFilterActorId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.audit(
      filterAction,
      filterActorId,
      filterFrom,
      filterTo,
      page,
    ),
    queryFn: () =>
      getAuditLog({
        action: filterAction ? (filterAction as AuditAction) : undefined,
        actor_id: filterActorId || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        page,
      }),
  });

  const { data: workers = [] } = useQuery({
    queryKey: QUERY_KEYS.workers,
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000,
  });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  const hasFilters = filterAction || filterActorId || filterFrom || filterTo;

  const clearFilters = () => {
    setFilterAction("");
    setFilterActorId("");
    setFilterFrom("");
    setFilterTo("");
    setPage(1);
  };

  return (
    <AuthGate adminOnly>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">
            Audit Log
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            All significant actions on timesheets and user accounts
          </p>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className="min-w-[160px]"
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </Select>
          <Select
            value={filterActorId}
            onChange={(e) => {
              setFilterActorId(e.target.value);
              setPage(1);
            }}
            className="min-w-[160px]"
          >
            <option value="">All actors</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => {
              setFilterFrom(e.target.value);
              setPage(1);
            }}
            className="w-auto"
            title="From date"
          />
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => {
              setFilterTo(e.target.value);
              setPage(1);
            }}
            className="w-auto"
            title="To date"
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>

        <Card overflow>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              Loading…
            </div>
          ) : (data?.data ?? []).length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-2xl">📋</p>
              <p className="mt-2 text-sm text-text-secondary">
                No audit records found
              </p>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center gap-3 text-sm text-text-secondary">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </Button>
            <span>
              Page {page} of {totalPages}
              {data && (
                <span className="ml-2 text-xs text-text-disabled">
                  ({data.total} total)
                </span>
              )}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next →
            </Button>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
