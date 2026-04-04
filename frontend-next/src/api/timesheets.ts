import apiClient from "@/config/api-client";
import type {
  Timesheet,
  TimesheetEntry,
  TimesheetSummary,
  LeaveBalance,
} from "@/types";

export async function getTimesheets(): Promise<TimesheetSummary[]> {
  const r = await apiClient.get<TimesheetSummary[]>("/api/timesheets");
  return r.data;
}

export async function getTimesheet(id: number): Promise<Timesheet> {
  const r = await apiClient.get<Timesheet>(`/api/timesheets/${id}`);
  return r.data;
}

export async function createTimesheet(
  weekStart: string,
): Promise<TimesheetSummary> {
  const r = await apiClient.post<TimesheetSummary>("/api/timesheets", {
    week_start: weekStart,
  });
  return r.data;
}

export async function saveEntries(
  id: number,
  entries: TimesheetEntry[],
): Promise<void> {
  await apiClient.put(`/api/timesheets/${id}/entries`, { entries });
}

export async function submitTimesheet(id: number): Promise<void> {
  await apiClient.post(`/api/timesheets/${id}/submit`);
}

export async function recallTimesheet(id: number): Promise<void> {
  await apiClient.post(`/api/timesheets/${id}/recall`);
}

export async function copyLastWeek(
  id: number,
): Promise<{ ok: boolean; entries: TimesheetEntry[] }> {
  const r = await apiClient.post<{ ok: boolean; entries: TimesheetEntry[] }>(
    `/api/timesheets/${id}/copy-last-week`,
  );
  return r.data;
}

export async function getLeaveBalance(year: number): Promise<LeaveBalance> {
  const r = await apiClient.get<LeaveBalance>("/api/timesheets/leave-balance", {
    params: { year },
  });
  return r.data;
}
