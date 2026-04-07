export type Role = "worker" | "team_lead" | "admin";

export type WorkType = "Remote" | "On-site" | "Leave" | "Holiday";

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface TimesheetEntry {
  id?: number;
  date: string; // yyyy-MM-dd
  is_present: boolean;
  hours: number | null;
  work_type: WorkType | null;
  notes: string | null;
  timesheet_status?: TimesheetStatus; // present on report entries
  overtime_hours?: number; // present on GET /timesheets/:id
}

export interface Timesheet {
  id: number;
  user_id: number;
  week_start: string; // yyyy-MM-dd
  status: TimesheetStatus;
  notes?: string | null;
  admin_note?: string | null;
  submitted_at?: string | null;
  present_days?: number;
  total_hours?: number;
  total_overtime_hours?: number;
  overtime_threshold?: number;
  worker_name?: string; // present on admin detail endpoint
  entries: TimesheetEntry[];
}

export interface TimesheetSummary {
  id: number;
  user_id?: number;
  worker_name?: string;
  week_start: string;
  status: TimesheetStatus;
  present_days: number;
  total_hours: number;
  submitted_at: string | null;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  member_count?: number;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_lead: boolean;
  joined_at: string;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

// Monthly report — all workers
export interface WorkerMonthSummary {
  user_id: number;
  name: string;
  email: string;
  timesheet_count: number;
  total_present_days: number;
  total_hours: number;
  overtime_hours: number;
}

export interface MonthlyReport {
  month: string;
  workers: WorkerMonthSummary[];
}

export interface PublicHoliday {
  id: number;
  date: string; // yyyy-MM-dd
  name: string;
  created_at: string;
}

export interface LeaveBalance {
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
}

export interface AdminLeaveBalance {
  user_id: number;
  name: string;
  email: string;
  allocated_days: number;
  used_days: number;
}

export interface BulkApproveResult {
  approved: number[];
  failed: number[];
}

export interface WeeklySummary {
  week_start: string;
  total_hours: number;
  present_days: number;
  worker_count?: number; // admin only
}

export interface AppSettings {
  overtime_threshold_hours: string;
}

export type AuditAction =
  | "approve"
  | "reject"
  | "submit"
  | "recall"
  | "create_user"
  | "delete_user"
  | "change_role"
  | "reset_password";

export interface AuditLog {
  id: number;
  actor_id: number | null;
  actor_name: string | null;
  action: AuditAction;
  target_type: "timesheet" | "user";
  target_id: number | null;
  target_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogPage {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

// Monthly report — single employee
export interface EmployeeReportSummary {
  total_present_days: number;
  total_hours: number;
  timesheet_count: number;
}

export interface EmployeeMonthlyReport {
  user: User;
  month: string;
  summary: EmployeeReportSummary;
  entries: TimesheetEntry[];
}
