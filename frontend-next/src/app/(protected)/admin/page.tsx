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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  getAdminTimesheets,
  getAdminTimesheet,
  approveTimesheet,
  rejectTimesheet,
  bulkApproveTimesheets,
  getAdminWeeklySummary,
  getAdminTimesheetPdfUrl,
  getUsers,
  getTeams,
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

function shortWeek(weekStart: string) {
  return format(parseISO(weekStart), "MMM d");
}

type Tab = "pending" | "all";

const QUERY_KEYS = {
  timesheets: (tab: Tab, month: string, worker: string, team: string) =>
    ["admin-timesheets", tab, month, worker, team] as const,
  workers: ["admin-workers"] as const,
  teams: ["admin-teams"] as const,
  weeklySummary: (team: string) => ["admin-weekly-summary", team] as const,
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
  const [filterTeam, setFilterTeam] = useState("");
  const [selected, setSelected] = useState<Timesheet | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  // Bulk approve state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const { data: workers = [] } = useQuery({
    queryKey: QUERY_KEYS.workers,
    queryFn: getUsers,
  });

  const { data: teams = [] } = useQuery({
    queryKey: QUERY_KEYS.teams,
    queryFn: getTeams,
  });

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.timesheets(tab, filterMonth, filterWorker, filterTeam),
    queryFn: () =>
      getAdminTimesheets({
        status: tab === "pending" ? "submitted" : undefined,
        month: filterMonth || undefined,
        user_id: filterWorker || undefined,
        team_id: filterTeam || undefined,
      }),
  });

  const { data: weeklySummary = [] } = useQuery({
    queryKey: QUERY_KEYS.weeklySummary(filterTeam),
    queryFn: () => getAdminWeeklySummary(8, filterTeam || undefined),
  });

  // Clear selection when tab/filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab, filterMonth, filterWorker, filterTeam]);

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

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: number[]) => bulkApproveTimesheets(ids),
    onSuccess: (result) => {
      void invalidate();
      setBulkConfirmOpen(false);
      setSelectedIds(new Set());
      const msg =
        result.failed.length === 0
          ? `${result.approved.length} timesheet${result.approved.length !== 1 ? "s" : ""} approved.`
          : `${result.approved.length} approved, ${result.failed.length} failed.`;
      alert(msg);
    },
    onError: () => alert("Bulk approve failed. Please try again."),
  });

  // Read-only form provider for DayRow in the modal
  const readOnlyMethods = useForm<WeeklyTimesheetForm>({
    defaultValues: { entries: selected?.entries ?? [] },
    values: { entries: selected?.entries ?? [] },
  });

  const workerOptions = workers.filter((u) => u.role === "worker");

  // Only submitted timesheets are selectable for bulk approve
  const selectableIds = timesheets
    .filter((t) => t.status === "submitted")
    .map((t) => t.id);
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chartData = weeklySummary.map((w) => ({
    week: shortWeek(w.week_start),
    hours: Number(w.total_hours),
  }));

  const columns: ColumnDef<TimesheetSummary>[] = [
    {
      id: "select",
      header: () =>
        selectableIds.length > 0 ? (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-3.5 w-3.5 accent-accent"
            aria-label="Select all"
          />
        ) : null,
      cell: ({ row }) =>
        row.original.status === "submitted" ? (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleOne(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 accent-accent"
            aria-label="Select row"
          />
        ) : null,
    },
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
    <AuthGate adminOnly allowTeamLead>
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

        {/* Team weekly hours chart */}
        {chartData.length > 0 && (
          <div className="mb-6">
            <Card>
              <div className="px-4 pt-4 pb-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Team Weekly Hours (last 8 weeks)
                </p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} barSize={18}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                    />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={32} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(v) => [`${Number(v)}h`, "Total Hours"]}
                    />
                    <Bar
                      dataKey="hours"
                      fill="var(--color-accent)"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
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
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="min-w-[140px]"
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
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
            {(filterMonth || filterWorker || filterTeam) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterMonth("");
                  setFilterWorker("");
                  setFilterTeam("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Bulk action toolbar */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center gap-3 rounded-md border border-accent/30 bg-accent-subtle px-4 py-2.5">
            <span className="text-sm font-medium text-accent">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="success"
              onClick={() => setBulkConfirmOpen(true)}
            >
              Approve {selectedIds.size} timesheet
              {selectedIds.size !== 1 ? "s" : ""}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect all
            </Button>
          </div>
        )}

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

        {/* Bulk approve confirmation modal */}
        {bulkConfirmOpen && (
          <Modal onClose={() => setBulkConfirmOpen(false)}>
            <h2 className="mb-2 text-base font-semibold text-text-primary">
              Approve {selectedIds.size} timesheet
              {selectedIds.size !== 1 ? "s" : ""}?
            </h2>
            <p className="mb-5 text-sm text-text-secondary">
              This will approve all {selectedIds.size} selected timesheet
              {selectedIds.size !== 1 ? "s" : ""}. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="success"
                onClick={() =>
                  bulkApproveMutation.mutate(Array.from(selectedIds))
                }
                disabled={bulkApproveMutation.isPending}
              >
                {bulkApproveMutation.isPending ? "Approving…" : "Confirm"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setBulkConfirmOpen(false)}
                disabled={bulkApproveMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </Modal>
        )}

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

            <div className="mb-3">
              <a
                href={getAdminTimesheetPdfUrl(selected.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                Download PDF
              </a>
            </div>

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
