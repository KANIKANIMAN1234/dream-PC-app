import { workDateJst } from "@/lib/attendance/format";
import type { AttendanceLog, DayAttendanceRow } from "@/lib/attendance/types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getActiveTenantId() {
  const { data, error } = await supabaseAdmin
    .from("m_tenants")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function listActiveEmployees(tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from("m_employees")
    .select("id,name,employee_code_4,is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("employee_code_4", { ascending: true })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    employee_code: row.employee_code_4 as string,
  }));
}

export async function listAttendanceLogs(tenantId: string, fromDate: string, toDate: string) {
  const startIso = `${fromDate}T00:00:00+09:00`;
  const endDate = new Date(`${toDate}T00:00:00+09:00`);
  endDate.setDate(endDate.getDate() + 1);
  const endIso = endDate.toISOString();

  const { data: employees, error: employeeError } = await supabaseAdmin
    .from("m_employees")
    .select("id,name,employee_code_4")
    .eq("tenant_id", tenantId)
    .limit(1000);
  if (employeeError) throw new Error(employeeError.message);

  const employeeMap = new Map(
    (employees ?? []).map((row) => [
      row.id as string,
      { name: row.name as string, employee_code: row.employee_code_4 as string },
    ]),
  );

  const { data: logs, error: logError } = await supabaseAdmin
    .from("t_attendance_logs")
    .select("id,employee_id,event_type,occurred_at")
    .eq("tenant_id", tenantId)
    .gte("occurred_at", startIso)
    .lt("occurred_at", endIso)
    .order("occurred_at", { ascending: true })
    .limit(20000);
  if (logError) throw new Error(logError.message);

  return (logs ?? []).flatMap((log) => {
    const employee = employeeMap.get(log.employee_id as string);
    if (!employee) return [];
    return [
      {
        id: log.id as string,
        employee_id: log.employee_id as string,
        employee_name: employee.name,
        employee_code: employee.employee_code,
        event_type: log.event_type as AttendanceLog["event_type"],
        occurred_at: log.occurred_at as string,
        work_date: workDateJst(log.occurred_at as string),
      } satisfies AttendanceLog,
    ];
  });
}

export async function listApprovedLeaveDates(tenantId: string, fromDate: string, toDate: string) {
  const { data, error } = await supabaseAdmin
    .from("t_leave_requests")
    .select("employee_id,start_date,end_date,status")
    .eq("tenant_id", tenantId)
    .eq("status", "approved")
    .lte("start_date", toDate)
    .gte("end_date", fromDate)
    .limit(5000);
  if (error) throw new Error(error.message);

  const set = new Set<string>();
  for (const leave of data ?? []) {
    const start = new Date(`${leave.start_date as string}T00:00:00`);
    const end = new Date(`${leave.end_date as string}T00:00:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ymd = d.toISOString().slice(0, 10);
      if (ymd >= fromDate && ymd <= toDate) {
        set.add(`${leave.employee_id as string}:${ymd}`);
      }
    }
  }
  return set;
}

export function aggregateDayRows(logs: AttendanceLog[], leaveKeys: Set<string>): DayAttendanceRow[] {
  const map = new Map<string, DayAttendanceRow>();

  for (const log of logs) {
    const key = `${log.employee_id}:${log.work_date}`;
    const row =
      map.get(key) ??
      ({
        employee_id: log.employee_id,
        employee_name: log.employee_name,
        employee_code: log.employee_code,
        work_date: log.work_date,
        clockIn: null,
        clockOut: null,
        isLeave: leaveKeys.has(key),
      } satisfies DayAttendanceRow);

    const hm = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(log.occurred_at));

    if (log.event_type === "start" && (!row.clockIn || hm < row.clockIn)) row.clockIn = hm;
    if (log.event_type === "end" && (!row.clockOut || hm > row.clockOut)) row.clockOut = hm;
    map.set(key, row);
  }

  return [...map.values()].sort((a, b) =>
    a.work_date === b.work_date
      ? a.employee_name.localeCompare(b.employee_name, "ja")
      : b.work_date.localeCompare(a.work_date),
  );
}
