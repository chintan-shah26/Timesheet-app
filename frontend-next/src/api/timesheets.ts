import apiClient from "@/config/api-client";
import type { Timesheet, TimesheetEntry, TimesheetSummary } from "@/types";

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
