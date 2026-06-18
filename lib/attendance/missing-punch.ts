import type { DayAttendanceRow, MissingPunchIssue } from "@/lib/attendance/types";

export function detectMissingPunch(row: DayAttendanceRow): string | null {
  if (row.isLeave) return null;
  if (!row.clockIn) {
    if (row.clockOut) return "出勤打刻なし";
    return null;
  }
  if (!row.clockOut) return "退勤打刻なし";
  return null;
}

export function collectMissingPunches(rows: DayAttendanceRow[]): MissingPunchIssue[] {
  return rows.flatMap((row) => {
    const issue = detectMissingPunch(row);
    if (!issue) return [];
    return [
      {
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        employee_code: row.employee_code,
        work_date: row.work_date,
        issue,
      },
    ];
  });
}
