import { formatHoursMinutes } from "@/lib/attendance/format";
import { buildMonthlyWorkSummaries, overtimeMinutesForEmployeeOnDate } from "@/lib/attendance/summary";
import type { Agreement36Alert, Agreement36AlertKind, AttendanceLog } from "@/lib/attendance/types";

export type Agreement36Settings = {
  enabled: boolean;
  startMonth: number;
  startDay: number;
  alertDailyHours: number;
  alertWeeklyHours: number;
  alertMonthlyHours: number;
  alertAvg26Hours: number;
  alertYearlyHours: number;
  alertExceedCount: number;
  specialMonthlyHours: number;
};

export const DEFAULT_AGREEMENT_36_SETTINGS: Agreement36Settings = {
  enabled: true,
  startMonth: 4,
  startDay: 1,
  alertDailyHours: 4,
  alertWeeklyHours: 20,
  alertMonthlyHours: 80,
  alertAvg26Hours: 60,
  alertYearlyHours: 600,
  alertExceedCount: 6,
  specialMonthlyHours: 100,
};

type EmployeeMeta = {
  id: string;
  name: string;
  employee_code: string;
};

function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function evaluationWorkDate(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  d.setDate(d.getDate() - 1);
  return toYmd(d);
}

function monthStart(workDate: string) {
  return `${workDate.slice(0, 7)}-01`;
}

function weekStartMonday(workDate: string) {
  const d = new Date(`${workDate}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toYmd(d);
}

function fiscalYearStart(workDate: string, startMonth: number, startDay: number) {
  const year = Number(workDate.slice(0, 4));
  const month = Number(workDate.slice(5, 7));
  const fiscalYear = month < startMonth || (month === startMonth && Number(workDate.slice(8, 10)) < startDay) ? year - 1 : year;
  return `${fiscalYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
}

function filterLogs(logs: AttendanceLog[], fromDate: string, toDate: string, employeeId?: string) {
  return logs.filter(
    (log) =>
      log.work_date >= fromDate &&
      log.work_date <= toDate &&
      (!employeeId || log.employee_id === employeeId),
  );
}

function sumOvertime(logs: AttendanceLog[]) {
  const byDate = new Map<string, AttendanceLog[]>();
  for (const log of logs) {
    const bucket = byDate.get(log.work_date) ?? [];
    bucket.push(log);
    byDate.set(log.work_date, bucket);
  }
  let total = 0;
  for (const dayLogs of byDate.values()) {
    total += overtimeMinutesForEmployeeOnDate(dayLogs);
  }
  return total;
}

function pushAlert(
  alerts: Agreement36Alert[],
  partial: Omit<Agreement36Alert, "employee_id" | "employee_name"> & {
    employee_id: string;
    employee_name: string;
  },
) {
  if (partial.actual < partial.threshold) return;
  alerts.push(partial);
}

export function evaluateAgreement36Alerts(
  employees: EmployeeMeta[],
  logs: AttendanceLog[],
  settings: Agreement36Settings = DEFAULT_AGREEMENT_36_SETTINGS,
  referenceDate = new Date(),
): { enabled: boolean; workDate: string; alerts: Agreement36Alert[] } {
  const workDate = evaluationWorkDate(referenceDate);
  if (!settings.enabled) {
    return { enabled: false, workDate, alerts: [] };
  }

  const fiscalStart = fiscalYearStart(workDate, settings.startMonth, settings.startDay);
  const alerts: Agreement36Alert[] = [];

  for (const employee of employees) {
    const employeeLogs = logs.filter((log) => log.employee_id === employee.id);

    const dailyLogs = filterLogs(employeeLogs, workDate, workDate, employee.id);
    const dailyOvertime = sumOvertime(dailyLogs);
    pushAlert(alerts, {
      kind: "daily",
      employee_id: employee.id,
      employee_name: employee.name,
      label: "1日の法定外労働",
      threshold: settings.alertDailyHours,
      actual: minutesToHours(dailyOvertime),
      unit: "hours",
    });

    const weekStart = weekStartMonday(workDate);
    const weeklyLogs = filterLogs(employeeLogs, weekStart, workDate, employee.id);
    pushAlert(alerts, {
      kind: "weekly",
      employee_id: employee.id,
      employee_name: employee.name,
      label: "1週の法定外労働",
      threshold: settings.alertWeeklyHours,
      actual: minutesToHours(sumOvertime(weeklyLogs)),
      unit: "hours",
    });

    const monthLogs = filterLogs(employeeLogs, monthStart(workDate), workDate, employee.id);
    pushAlert(alerts, {
      kind: "monthly",
      employee_id: employee.id,
      employee_name: employee.name,
      label: "1か月の法定外労働",
      threshold: settings.alertMonthlyHours,
      actual: minutesToHours(sumOvertime(monthLogs)),
      unit: "hours",
    });

    const monthKeys = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date(`${workDate}T00:00:00`);
      d.setMonth(d.getMonth() - idx);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const monthlyHours = monthKeys
      .slice(1)
      .map((monthKey) => {
        const from = `${monthKey}-01`;
        const to =
          monthKey === workDate.slice(0, 7)
            ? workDate
            : `${monthKey}-${String(new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0).getDate()).padStart(2, "0")}`;
        return minutesToHours(sumOvertime(filterLogs(employeeLogs, from, to, employee.id)));
      });
    const avg26 =
      monthlyHours.length > 0
        ? Math.round((monthlyHours.reduce((sum, value) => sum + value, 0) / monthlyHours.length) * 100) / 100
        : 0;
    pushAlert(alerts, {
      kind: "avg_2_6",
      employee_id: employee.id,
      employee_name: employee.name,
      label: "2〜6か月の平均",
      threshold: settings.alertAvg26Hours,
      actual: avg26,
      unit: "hours",
    });

    const yearlyLogs = filterLogs(employeeLogs, fiscalStart, workDate, employee.id);
    pushAlert(alerts, {
      kind: "yearly",
      employee_id: employee.id,
      employee_name: employee.name,
      label: "1年の法定外労働",
      threshold: settings.alertYearlyHours,
      actual: minutesToHours(sumOvertime(yearlyLogs)),
      unit: "hours",
    });

    const exceedCount = monthKeys
      .map((monthKey) => {
        const from = `${monthKey}-01`;
        const to =
          monthKey === workDate.slice(0, 7)
            ? workDate
            : `${monthKey}-${String(new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0).getDate()).padStart(2, "0")}`;
        return minutesToHours(sumOvertime(filterLogs(employeeLogs, from, to, employee.id)));
      })
      .filter((hours) => hours >= settings.specialMonthlyHours).length;
    pushAlert(alerts, {
      kind: "exceed_count",
      employee_id: employee.id,
      employee_name: employee.name,
      label: "限度時間超過回数",
      threshold: settings.alertExceedCount,
      actual: exceedCount,
      unit: "count",
    });
  }

  return { enabled: true, workDate, alerts };
}

export function formatAgreement36AlertMessage(alert: Agreement36Alert) {
  const actual =
    alert.unit === "hours"
      ? `${alert.actual}時間（${formatHoursMinutes(Math.round(alert.actual * 60))}）`
      : `${alert.actual}回`;
  return `【36協定アラート】${alert.employee_name}さんの${alert.label}が基準を超えました。基準: ${alert.threshold}${alert.unit === "hours" ? "時間" : "回"} / 実績: ${actual}`;
}

export function agreement36AlertKindLabel(kind: Agreement36AlertKind) {
  const map: Record<Agreement36AlertKind, string> = {
    daily: "日次",
    weekly: "週次",
    monthly: "月次",
    avg_2_6: "2〜6か月平均",
    yearly: "年次",
    exceed_count: "超過回数",
  };
  return map[kind];
}
