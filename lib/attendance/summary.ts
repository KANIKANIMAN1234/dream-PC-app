import { calculateBreakMinutes, calculateWorkMinutes, formatHoursMinutes } from "@/lib/attendance/format";
import type { AttendanceLog, MonthlyWorkSummary } from "@/lib/attendance/types";

const DEFAULT_DAILY_THRESHOLD_MINUTES = 8 * 60;

type EmployeeMeta = {
  id: string;
  name: string;
  employee_code: string;
};

function groupLogsByEmployeeDate(logs: AttendanceLog[]) {
  const map = new Map<string, AttendanceLog[]>();
  for (const log of logs) {
    const key = `${log.employee_id}:${log.work_date}`;
    const bucket = map.get(key) ?? [];
    bucket.push(log);
    map.set(key, bucket);
  }
  return map;
}

function overtimeForDay(workMinutes: number, dailyThresholdMinutes = DEFAULT_DAILY_THRESHOLD_MINUTES) {
  return Math.max(0, workMinutes - dailyThresholdMinutes);
}

export function buildMonthlyWorkSummaries(
  employees: EmployeeMeta[],
  logs: AttendanceLog[],
  dailyThresholdMinutes = DEFAULT_DAILY_THRESHOLD_MINUTES,
): MonthlyWorkSummary[] {
  const grouped = groupLogsByEmployeeDate(logs);

  return employees.map((employee) => {
    let workDays = 0;
    let workMinutes = 0;
    let breakMinutes = 0;
    let overtimeMinutes = 0;

    for (const [key, dayLogs] of grouped.entries()) {
      if (!key.startsWith(`${employee.id}:`)) continue;
      const dayWork = calculateWorkMinutes(dayLogs);
      const dayBreak = calculateBreakMinutes(dayLogs);
      if (dayWork <= 0 && dayBreak <= 0) continue;
      workDays += 1;
      workMinutes += dayWork;
      breakMinutes += dayBreak;
      overtimeMinutes += overtimeForDay(dayWork, dailyThresholdMinutes);
    }

    return {
      employee_id: employee.id,
      employee_name: employee.name,
      employee_code: employee.employee_code,
      work_days: workDays,
      work_minutes: workMinutes,
      break_minutes: breakMinutes,
      overtime_minutes: overtimeMinutes,
      work_time: formatHoursMinutes(workMinutes),
      overtime_time: formatHoursMinutes(overtimeMinutes),
    };
  });
}

export function overtimeMinutesForEmployeeOnDate(
  logs: AttendanceLog[],
  dailyThresholdMinutes = DEFAULT_DAILY_THRESHOLD_MINUTES,
) {
  return overtimeForDay(calculateWorkMinutes(logs), dailyThresholdMinutes);
}
