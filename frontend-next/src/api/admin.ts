import apiClient from "@/config/api-client";
import type {
  Timesheet,
  TimesheetSummary,
  User,
  Role,
  MonthlyReport,
  EmployeeMonthlyReport,
} from "@/types";

// Timesheets
export async function getAdminTimesheets(params: {
  status?: string;
  month?: string;
  user_id?: string;
}): Promise<TimesheetSummary[]> {
  const r = await apiClient.get<TimesheetSummary[]>("/api/admin/timesheets", {
    params,
  });
  return r.data;
}

export async function getAdminTimesheet(id: number): Promise<Timesheet> {
  const r = await apiClient.get<Timesheet>(`/api/admin/timesheets/${id}`);
  return r.data;
}

export async function approveTimesheet(id: number): Promise<void> {
  await apiClient.post(`/api/admin/timesheets/${id}/approve`);
}

export async function rejectTimesheet(id: number, note: string): Promise<void> {
  await apiClient.post(`/api/admin/timesheets/${id}/reject`, { note });
}

// Users
export async function getUsers(): Promise<User[]> {
  const r = await apiClient.get<User[]>("/api/admin/users");
  return r.data;
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  role: Role;
}): Promise<User> {
  const r = await apiClient.post<User>("/api/admin/users", data);
  return r.data;
}

export async function changeUserRole(id: number, role: Role): Promise<void> {
  await apiClient.patch(`/api/admin/users/${id}/role`, { role });
}

export async function resetUserPassword(
  id: number,
  password: string,
): Promise<void> {
  await apiClient.patch(`/api/admin/users/${id}/password`, { password });
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/api/admin/users/${id}`);
}

// Reports
export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const r = await apiClient.get<MonthlyReport>("/api/admin/reports/monthly", {
    params: { month },
  });
  return r.data;
}

export async function getEmployeeMonthlyReport(
  month: string,
  userId: string,
): Promise<EmployeeMonthlyReport> {
  const r = await apiClient.get<EmployeeMonthlyReport>(
    "/api/admin/reports/monthly/employee",
    { params: { month, user_id: userId } },
  );
  return r.data;
}
