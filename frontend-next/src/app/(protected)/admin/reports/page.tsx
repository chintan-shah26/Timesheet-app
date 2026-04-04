"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import {
  getMonthlyReport,
  getEmployeeMonthlyReport,
  getUsers,
  getTeams,
} from "@/api/admin";
import { API_BASE_URL } from "@/config/api-client";
import AuthGate from "@/components/common/auth-gate";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import Input from "@/components/common/input";
import Select from "@/components/common/select";
import type {
  WorkerMonthSummary,
  TimesheetEntry,
  EmployeeMonthlyReport,
  MonthlyReport,
} from "@/types";

function defaultMonth() {
  return format(new Date(), "yyyy-MM");
}

function safeCsvCell(val: string): string {
  return /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const workerColumns: ColumnDef<WorkerMonthSummary>[] = [
  { accessorKey: "name", header: "Worker" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "timesheet_count", header: "Approved Timesheets" },
  { accessorKey: "total_present_days", header: "Present Days" },
  {
    accessorKey: "total_hours",
    header: "Total Hours",
    cell: ({ row }) =>
      row.original.total_hours > 0 ? `${row.original.total_hours}h` : "—",
  },
];

const employeeColumns: ColumnDef<TimesheetEntry>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => format(parseISO(row.original.date), "EEE, MMM d"),
  },
  {
    accessorKey: "is_present",
    header: "Present",
    cell: ({ row }) => (row.original.is_present ? "Yes" : "No"),
  },
  {
    accessorKey: "hours",
    header: "Hours",
    cell: ({ row }) =>
      row.original.is_present && row.original.hours
        ? `${row.original.hours}h`
        : "—",
  },
  {
    accessorKey: "work_type",
    header: "Work Type",
    cell: ({ row }) => row.original.work_type ?? "—",
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => row.original.notes ?? "",
  },
  {
    accessorKey: "timesheet_status",
    header: "Status",
    cell: ({ row }) => (
      <span className="capitalize">{row.original.timesheet_status}</span>
    ),
  },
];

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(defaultMonth);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [fetchParams, setFetchParams] = useState<{
    month: string;
    worker: string;
    team: string;
  } | null>(null);

  const { data: workers = [] } = useQuery({
    queryKey: ["admin-workers"],
    queryFn: getUsers,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: getTeams,
  });

  const { data: teamReport, isFetching: teamFetching } =
    useQuery<MonthlyReport>({
      queryKey: ["monthly-report", fetchParams?.month, fetchParams?.team],
      queryFn: () =>
        getMonthlyReport(fetchParams!.month, fetchParams!.team || undefined),
      enabled: !!fetchParams && !fetchParams.worker,
    });

  const { data: employeeReport, isFetching: empFetching } =
    useQuery<EmployeeMonthlyReport>({
      queryKey: ["employee-report", fetchParams?.month, fetchParams?.worker],
      queryFn: () =>
        getEmployeeMonthlyReport(fetchParams!.month, fetchParams!.worker),
      enabled: !!fetchParams && !!fetchParams.worker,
    });

  const isLoading = teamFetching || empFetching;
  const hasData = !!teamReport || !!employeeReport;

  const apiBase = API_BASE_URL;

  function handleExportCsv() {
    if (employeeReport) {
      const header = "Date,Present,Hours,Work Type,Notes,Timesheet Status";
      const rows = employeeReport.entries.map(
        (e) =>
          `${e.date},${e.is_present ? "Yes" : "No"},${e.is_present && e.hours ? e.hours : ""},"${safeCsvCell(e.work_type ?? "")}","${safeCsvCell((e.notes ?? "").replace(/"/g, '""'))}",${e.timesheet_status}`,
      );
      rows.push(
        `TOTAL,${employeeReport.summary.total_present_days} days,${employeeReport.summary.total_hours}h,,,`,
      );
      downloadCsv(
        [header, ...rows].join("\n"),
        `report-${employeeReport.user.name.replace(/\s+/g, "-")}-${fetchParams!.month}.csv`,
      );
    } else if (teamReport) {
      const header = "Name,Email,Approved Timesheets,Present Days,Total Hours";
      const rows = teamReport.workers.map(
        (w) =>
          `"${safeCsvCell(w.name)}","${safeCsvCell(w.email)}",${w.timesheet_count},${w.total_present_days},${w.total_hours}`,
      );
      downloadCsv(
        [header, ...rows].join("\n"),
        `monthly-report-${fetchParams!.month}.csv`,
      );
    }
  }

  function handleExportExcel() {
    const params = new URLSearchParams({ month: fetchParams!.month });
    if (fetchParams?.worker) params.set("user_id", fetchParams.worker);
    window.location.href = `${apiBase}/api/admin/reports/monthly/export?${params}`;
  }

  const workerOptions = workers.filter((u) => u.role === "worker");

  const teamTable = useReactTable({
    data: teamReport?.workers ?? [],
    columns: workerColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const empTable = useReactTable({
    data: employeeReport?.entries ?? [],
    columns: employeeColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totals = teamReport?.workers.reduce(
    (acc, w) => ({
      timesheets: acc.timesheets + Number(w.timesheet_count),
      days: acc.days + Number(w.total_present_days),
      hours: acc.hours + Number(w.total_hours),
    }),
    { timesheets: 0, days: 0, hours: 0 },
  );

  return (
    <AuthGate adminOnly>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">
            Monthly Report
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            View attendance and hours by month
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Month
              </label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-auto"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Employee
              </label>
              <Select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-44"
              >
                <option value="">All employees</option>
                {workerOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Team
              </label>
              <Select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-40"
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={() =>
                setFetchParams({
                  month,
                  worker: selectedWorker,
                  team: selectedTeam,
                })
              }
              disabled={isLoading}
            >
              {isLoading ? "Loading…" : "Generate Report"}
            </Button>
            {hasData && (
              <>
                <Button variant="secondary" onClick={handleExportCsv}>
                  ↓ CSV
                </Button>
                <Button variant="secondary" onClick={handleExportExcel}>
                  ↓ Excel
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Team summary table */}
        {teamReport && (
          <Card overflow className="mb-6">
            <div className="border-b border-border px-5 py-3 text-xs text-text-secondary">
              Approved timesheets for{" "}
              <strong className="text-text-primary">
                {format(new Date(fetchParams!.month + "-01"), "MMMM yyyy")}
              </strong>{" "}
              — all employees
            </div>
            <table className="w-full text-sm">
              <thead>
                {teamTable.getHeaderGroups().map((hg) => (
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
                {teamTable.getRowModel().rows.map((row) => (
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
                {totals && (
                  <tr className="border-t border-border bg-surface font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-text-primary">
                      Total
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {totals.timesheets}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {totals.days}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {totals.hours > 0 ? `${totals.hours}h` : "—"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        )}

        {/* Employee detail table */}
        {employeeReport && (
          <Card overflow>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {employeeReport.user.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {employeeReport.user.email} ·{" "}
                  {format(new Date(fetchParams!.month + "-01"), "MMMM yyyy")}
                </p>
              </div>
              <div className="flex gap-6 text-xs text-text-secondary">
                <span>
                  Present:{" "}
                  <strong className="text-text-primary">
                    {employeeReport.summary.total_present_days} days
                  </strong>
                </span>
                <span>
                  Hours:{" "}
                  <strong className="text-text-primary">
                    {employeeReport.summary.total_hours > 0
                      ? `${employeeReport.summary.total_hours}h`
                      : "—"}
                  </strong>
                </span>
                <span>
                  Timesheets:{" "}
                  <strong className="text-text-primary">
                    {employeeReport.summary.timesheet_count}
                  </strong>
                </span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                {empTable.getHeaderGroups().map((hg) => (
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
                {empTable.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-0 ${!row.original.is_present ? "opacity-50" : ""}`}
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
          </Card>
        )}

        {!hasData && !isLoading && (
          <div className="mt-12 text-center">
            <p className="text-2xl">📊</p>
            <p className="mt-2 text-sm text-text-secondary">
              Select a month and click Generate Report
            </p>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
