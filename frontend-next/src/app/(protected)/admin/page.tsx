"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { format, parseISO, addDays } from "date-fns";
import {
  getAdminTimesheets,
  getAdminTimesheet,
  approveTimesheet,
  rejectTimesheet,
  getUsers,
} from "@/api/admin";
import AuthGate from "@/components/common/auth-gate";
import Badge from "@/components/common/badge";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import Input from "@/components/common/input";
import Modal from "@/components/common/modal";
import Select from "@/components/common/select";
import Textarea from "@/components/common/textarea";
import DayRow, {
  type WeeklyTimesheetForm,
} from "@/components/pages/weekly-timesheet/day-row";
import type { Timesheet, TimesheetSummary } from "@/types";
import { FormProvider, useForm } from "react-hook-form";
import { useAuth } from "@/context/auth-context";
import { getGreeting, getFirstName } from "@/lib/greeting";

function weekLabel(weekStart: string) {
  const mon = parseISO(weekStart);
  return `${format(mon, "MMM d")} – ${format(addDays(mon, 6), "MMM d, yyyy")}`;
}

type Tab = "pending" | "all";

const QUERY_KEYS = {
  timesheets: (tab: Tab, month: string, worker: string) =>
    ["admin-timesheets", tab, month, worker] as const,
  workers: ["admin-workers"] as const,
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterWorker, setFilterWorker] = useState("");
  const [selected, setSelected] = useState<Timesheet | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const { data: workers = [] } = useQuery({
    queryKey: QUERY_KEYS.workers,
    queryFn: getUsers,
  });

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.timesheets(tab, filterMonth, filterWorker),
    queryFn: () =>
      getAdminTimesheets({
        status: tab === "pending" ? "submitted" : undefined,
        month: filterMonth || undefined,
        user_id: filterWorker || undefined,
      }),
  });

  const openSheet = async (t: TimesheetSummary) => {
    try {
      const full = await getAdminTimesheet(t.id);
      setSelected(full);
      setRejectMode(false);
      setRejectNote("");
    } catch {
      alert("Failed to load timesheet. Please try again.");
    }
  };

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["admin-timesheets"],
    });

  const approveMutation = useMutation({
    mutationFn: (sheetId: number) => approveTimesheet(sheetId),
    onSuccess: () => {
      void invalidate();
      setSelected(null);
    },
    onError: () => alert("Approve failed. Please try again."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      rejectTimesheet(id, note),
    onSuccess: () => {
      void invalidate();
      setSelected(null);
    },
    onError: () => alert("Reject failed. Please try again."),
  });

  // Read-only form provider for DayRow in the modal
  const readOnlyMethods = useForm<WeeklyTimesheetForm>({
    defaultValues: { entries: selected?.entries ?? [] },
    values: { entries: selected?.entries ?? [] },
  });

  const workerOptions = workers.filter((u) => u.role === "worker");

  const columns: ColumnDef<TimesheetSummary>[] = [
    { accessorKey: "worker_name", header: "Worker" },
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

  const table = useReactTable({
    data: timesheets,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <AuthGate adminOnly>
      <div>
        {greeting && (
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-text-primary">
              {greeting}, {getFirstName(user?.name ?? "")}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Review and approve submitted timesheets
            </p>
          </div>
        )}
        {!greeting && (
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-text-primary">
              Timesheets
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Review and approve submitted timesheets
            </p>
          </div>
        )}

        {/* Tabs + filters */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-md border border-border bg-surface p-0.5">
            {(["pending", "all"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  tab === t
                    ? "bg-background text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t === "pending" ? "Pending Review" : "All Timesheets"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-auto"
            />
            <Select
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              className="min-w-[160px]"
            >
              <option value="">All workers</option>
              {workerOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            {(filterMonth || filterWorker) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterMonth("");
                  setFilterWorker("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <Card overflow>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              Loading…
            </div>
          ) : timesheets.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-2xl">📥</p>
              <p className="mt-2 text-sm text-text-secondary">
                {tab === "pending"
                  ? "No timesheets pending review"
                  : "No timesheets found"}
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
                    onClick={() => void openSheet(row.original)}
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

        {/* Sheet detail modal */}
        {selected && (
          <Modal onClose={() => setSelected(null)} wide>
            <h2 className="mb-1 text-base font-semibold text-text-primary">
              {selected.worker_name} — {weekLabel(selected.week_start)}
            </h2>
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              <Badge status={selected.status} />
              <span>
                Present:{" "}
                <strong className="text-text-primary">
                  {selected.entries.filter((e) => e.is_present).length} days
                </strong>
              </span>
              <span>
                Hours:{" "}
                <strong className="text-text-primary">
                  {selected.entries.reduce(
                    (s, e) =>
                      s + (e.is_present && e.hours ? Number(e.hours) : 0),
                    0,
                  )}
                  h
                </strong>
              </span>
            </div>

            <Card className="mb-4">
              <div className="grid grid-cols-[140px_120px_90px_120px_1fr] gap-3 border-b border-border px-4 py-2">
                {["Day", "Presence", "Hours", "Type", "Notes"].map((h) => (
                  <span
                    key={h}
                    className="text-xs font-medium uppercase tracking-wide text-text-secondary"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <FormProvider {...readOnlyMethods}>
                {selected.entries.map((entry, i) => (
                  <DayRow key={entry.date} index={i} readOnly />
                ))}
              </FormProvider>
            </Card>

            {selected.status === "submitted" && !rejectMode && (
              <div className="flex gap-3">
                <Button
                  variant="success"
                  onClick={() => approveMutation.mutate(selected.id)}
                  disabled={approveMutation.isPending}
                >
                  ✓ Approve
                </Button>
                <Button variant="danger" onClick={() => setRejectMode(true)}>
                  Reject
                </Button>
              </div>
            )}

            {rejectMode && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Rejection note{" "}
                  <span className="font-normal text-text-disabled">
                    (optional — shown to worker)
                  </span>
                </label>
                <Textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="e.g. Missing hours for Wednesday"
                  className="mb-3"
                />
                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    onClick={() =>
                      rejectMutation.mutate({
                        id: selected.id,
                        note: rejectNote,
                      })
                    }
                    disabled={rejectMutation.isPending}
                  >
                    Confirm Reject
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setRejectMode(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        )}
      </div>
    </AuthGate>
  );
}
