"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { format, parseISO, addDays, startOfWeek } from "date-fns";
import {
  getTimesheets,
  createTimesheet,
  getLeaveBalance,
} from "@/api/timesheets";
import { getGreeting, getFirstName } from "@/lib/greeting";
import { useAuth } from "@/context/auth-context";
import Badge from "@/components/common/badge";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import type { TimesheetSummary } from "@/types";

function weekLabel(weekStart: string) {
  const mon = parseISO(weekStart);
  return `${format(mon, "MMM d")} – ${format(addDays(mon, 6), "MMM d, yyyy")}`;
}

const CURRENT_YEAR = new Date().getFullYear();

const QUERY_KEYS = {
  timesheets: ["timesheets"] as const,
  leaveBalance: (year: number) => ["leave-balance", year] as const,
};

const columns: ColumnDef<TimesheetSummary>[] = [
  {
    accessorKey: "week_start",
    header: "Week",
    cell: ({ row }) => weekLabel(row.original.week_start),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge status={row.original.status} />,
  },
  { accessorKey: "present_days", header: "Present Days" },
  {
    accessorKey: "total_hours",
    header: "Total Hours",
    cell: ({ row }) =>
      row.original.total_hours ? `${row.original.total_hours}h` : "—",
  },
  {
    accessorKey: "submitted_at",
    header: "Submitted",
    cell: ({ row }) =>
      row.original.submitted_at
        ? format(new Date(row.original.submitted_at), "MMM d")
        : "—",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    if (user?.role === "admin") router.replace("/admin");
  }, [user, router]);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.timesheets,
    queryFn: getTimesheets,
    enabled: user?.role === "worker",
  });

  const { data: leaveBalance } = useQuery({
    queryKey: QUERY_KEYS.leaveBalance(CURRENT_YEAR),
    queryFn: () => getLeaveBalance(CURRENT_YEAR),
    enabled: user?.role === "worker",
  });

  const createMutation = useMutation({
    mutationFn: createTimesheet,
    onSuccess: (sheet) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timesheets });
      router.push(`/timesheets/${sheet.id}`);
    },
    onError: (err: unknown) => {
      // 409 = week already exists, navigate to it
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        const weekStart = format(
          startOfWeek(new Date(), { weekStartsOn: 1 }),
          "yyyy-MM-dd",
        );
        const existing = timesheets.find((t) => t.week_start === weekStart);
        if (existing) router.push(`/timesheets/${existing.id}`);
      }
    },
  });

  const table = useReactTable({
    data: timesheets,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (user?.role === "admin") return null;

  return (
    <div>
      {greeting && (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">
            {greeting}, {getFirstName(user?.name ?? "")}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Here&apos;s your timesheet overview
          </p>
        </div>
      )}

      {/* Leave balance widget */}
      {leaveBalance && (
        <div className="mb-6">
          <Card>
            <div className="flex items-center gap-6 px-5 py-4">
              <div className="text-center">
                <p className="text-2xl font-semibold text-text-primary">
                  {leaveBalance.allocated_days}
                </p>
                <p className="text-xs text-text-secondary">Allocated</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-semibold text-text-primary">
                  {leaveBalance.used_days}
                </p>
                <p className="text-xs text-text-secondary">Used</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p
                  className={`text-2xl font-semibold ${leaveBalance.remaining_days <= 0 ? "text-danger" : "text-accent"}`}
                >
                  {leaveBalance.remaining_days}
                </p>
                <p className="text-xs text-text-secondary">Remaining</p>
              </div>
              <div className="ml-2">
                <p className="text-sm font-medium text-text-primary">
                  Leave Balance {CURRENT_YEAR}
                </p>
                <p className="text-xs text-text-secondary">
                  Days counted from submitted &amp; approved timesheets
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            My Timesheets
          </h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Track your weekly attendance and hours
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            createMutation.mutate(
              format(
                startOfWeek(new Date(), { weekStartsOn: 1 }),
                "yyyy-MM-dd",
              ),
            )
          }
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Creating…" : "+ New Week"}
        </Button>
      </div>

      <Card overflow>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-text-secondary">
            Loading…
          </div>
        ) : timesheets.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-2xl">🕐</p>
            <p className="mt-2 text-sm text-text-secondary">
              No timesheets yet
            </p>
            <p className="text-xs text-text-disabled">
              Start by creating one for the current week
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
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt"
                  onClick={() => router.push(`/timesheets/${row.original.id}`)}
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
    </div>
  );
}
