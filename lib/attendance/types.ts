export type AttendanceEventType = "start" | "end" | "out" | "work";

export type AttendanceLog = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  event_type: AttendanceEventType;
  occurred_at: string;
  work_date: string;
};

export type DayAttendanceRow = {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  work_date: string;
  clockIn: string | null;
  clockOut: string | null;
  isLeave: boolean;
};

export type MissingPunchIssue = {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  work_date: string;
  issue: string;
};

export type MonthlyWorkSummary = {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  work_days: number;
  work_minutes: number;
  break_minutes: number;
  overtime_minutes: number;
  work_time: string;
  overtime_time: string;
};

export type Agreement36AlertKind = "daily" | "weekly" | "monthly" | "avg_2_6" | "yearly" | "exceed_count";

export type Agreement36Alert = {
  kind: Agreement36AlertKind;
  employee_id: string;
  employee_name: string;
  label: string;
  threshold: number;
  actual: number;
  unit: "hours" | "count";
};
