import apiClient from "@/config/api-client";
import type {
  Timesheet,
  TimesheetSummary,
  User,
  Role,
  MonthlyReport,
  EmployeeMonthlyReport,
  PublicHoliday,
  AdminLeaveBalance,
  Team,
  TeamDetail,
  BulkApproveResult,
} from "@/types";

// Timesheets
export async function getAdminTimesheets(params: {
  status?: string;
  month?: string;
  user_id?: string;
  team_id?: string;
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

export async function bulkApproveTimesheets(
  ids: number[],
): Promise<BulkApproveResult> {
  const r = await apiClient.post<BulkApproveResult>(
    "/api/admin/timesheets/bulk-approve",
    { ids },
  );
  return r.data;
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

// Teams
export async function getTeams(): Promise<Team[]> {
  const r = await apiClient.get<Team[]>("/api/admin/teams");
  return r.data;
}

export async function getTeam(id: number): Promise<TeamDetail> {
  const r = await apiClient.get<TeamDetail>(`/api/admin/teams/${id}`);
  return r.data;
}

export async function createTeam(data: {
  name: string;
  description?: string;
}): Promise<Team> {
  const r = await apiClient.post<Team>("/api/admin/teams", data);
  return r.data;
}

export async function updateTeam(
  id: number,
  data: { name: string; description?: string },
): Promise<Team> {
  const r = await apiClient.put<Team>(`/api/admin/teams/${id}`, data);
  return r.data;
}

export async function deleteTeam(id: number): Promise<void> {
  await apiClient.delete(`/api/admin/teams/${id}`);
}

export async function addTeamMember(
  teamId: number,
  userId: number,
  isLead = false,
): Promise<void> {
  await apiClient.post(`/api/admin/teams/${teamId}/members`, {
    user_id: userId,
    is_lead: isLead,
  });
}

export async function removeTeamMember(
  teamId: number,
  userId: number,
): Promise<void> {
  await apiClient.delete(`/api/admin/teams/${teamId}/members/${userId}`);
}

export async function updateTeamMemberLead(
  teamId: number,
  userId: number,
  isLead: boolean,
): Promise<void> {
  await apiClient.patch(`/api/admin/teams/${teamId}/members/${userId}`, {
    is_lead: isLead,
  });
}

// Reports
export async function getMonthlyReport(
  month: string,
  teamId?: string,
): Promise<MonthlyReport> {
  const r = await apiClient.get<MonthlyReport>("/api/admin/reports/monthly", {
    params: { month, ...(teamId ? { team_id: teamId } : {}) },
  });
  return r.data;
}

// Holidays
export async function getHolidays(year?: number): Promise<PublicHoliday[]> {
  const r = await apiClient.get<PublicHoliday[]>("/api/admin/holidays", {
    params: year ? { year } : {},
  });
  return r.data;
}

export async function createHoliday(data: {
  date: string;
  name: string;
}): Promise<PublicHoliday> {
  const r = await apiClient.post<PublicHoliday>("/api/admin/holidays", data);
  return r.data;
}

export async function deleteHoliday(id: number): Promise<void> {
  await apiClient.delete(`/api/admin/holidays/${id}`);
}

// Leave balances
export async function getLeaveBalances(
  year: number,
): Promise<AdminLeaveBalance[]> {
  const r = await apiClient.get<AdminLeaveBalance[]>(
    "/api/admin/leave-balances",
    { params: { year } },
  );
  return r.data;
}

export async function setLeaveBalance(data: {
  user_id: number;
  year: number;
  allocated_days: number;
}): Promise<void> {
  await apiClient.post("/api/admin/leave-balances", data);
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
