import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { demoPayrollRows } from "@/lib/demoAttendanceData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PayrollRow = {
  employee_code: string;
  employee_name: string;
  work_days: number;
  paid_leave_days: number;
  absence_days: number;
  late_count: number;
  early_leave_count: number;
  overtime_hours: number;
};

function monthRange(targetMonth: string) {
  const [year, month] = targetMonth.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end, year, month };
}

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calcWorkDays(
  logs: { employee_id: string; event_type: string; occurred_at: string }[],
  employeeId: string,
) {
  const days = new Set<string>();
  logs.forEach((log) => {
    if (log.employee_id !== employeeId) return;
    if (log.event_type === "start" || log.event_type === "end") {
      days.add(toYmd(new Date(log.occurred_at)));
    }
  });
  return days.size;
}

function calcOvertimeHours(
  logs: { employee_id: string; event_type: string; occurred_at: string }[],
  employeeId: string,
) {
  const byDay = new Map<string, { start?: string; end?: string }>();
  logs.forEach((log) => {
    if (log.employee_id !== employeeId) return;
    const key = toYmd(new Date(log.occurred_at));
    const cell = byDay.get(key) ?? {};
    const hm = new Date(log.occurred_at).toISOString().slice(11, 16);
    if (log.event_type === "start" && (!cell.start || hm < cell.start)) cell.start = hm;
    if (log.event_type === "end" && (!cell.end || hm > cell.end)) cell.end = hm;
    byDay.set(key, cell);
  });

  let totalMinutes = 0;
  byDay.forEach((cell) => {
    if (!cell.start || !cell.end) return;
    const [sh, sm] = cell.start.split(":").map(Number);
    const [eh, em] = cell.end.split(":").map(Number);
    const worked = eh * 60 + em - (sh * 60 + sm);
    const overtime = worked - 8 * 60;
    if (overtime > 0) totalMinutes += overtime;
  });
  return Math.round((totalMinutes / 60) * 10) / 10;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetMonth = searchParams.get("month");
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      return NextResponse.json({ ok: false, message: "month (YYYY-MM) が必要です。" }, { status: 400 });
    }

    const { start, end, year, month } = monthRange(targetMonth);

    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenantRow) {
      return NextResponse.json({
        ok: true,
        month: targetMonth,
        rows: demoPayrollRows(),
        isDemo: true,
        note: "テナント未接続のためデモデータを表示しています。",
      });
    }

    const { data: employees, error: employeeError } = await supabaseAdmin
      .from("m_employees")
      .select("id,employee_code_4,name,is_active")
      .eq("tenant_id", tenantRow.id)
      .eq("is_active", true)
      .order("employee_code_4", { ascending: true })
      .limit(500);
    if (employeeError) return NextResponse.json({ ok: false, message: employeeError.message }, { status: 500 });

    const { data: logs, error: logError } = await supabaseAdmin
      .from("t_attendance_logs")
      .select("employee_id,event_type,occurred_at")
      .eq("tenant_id", tenantRow.id)
      .gte("occurred_at", start.toISOString())
      .lt("occurred_at", end.toISOString())
      .limit(10000);
    if (logError) return NextResponse.json({ ok: false, message: logError.message }, { status: 500 });

    const monthStart = toYmd(start);
    const monthEnd = toYmd(new Date(end.getTime() - 86400000));
    const { data: leaves, error: leaveError } = await supabaseAdmin
      .from("t_leave_requests")
      .select("employee_id,start_date,end_date,status,leave_type")
      .eq("tenant_id", tenantRow.id)
      .eq("status", "approved")
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart)
      .limit(2000);
    if (leaveError) return NextResponse.json({ ok: false, message: leaveError.message }, { status: 500 });

    const rows: PayrollRow[] = (employees ?? []).map((emp) => {
      const paidLeaveDays = (leaves ?? []).reduce((acc, leave) => {
        if (leave.employee_id !== emp.id) return acc;
        const startDate = new Date(`${leave.start_date}T00:00:00Z`);
        const endDate = new Date(`${leave.end_date}T00:00:00Z`);
        let count = 0;
        for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
          const key = toYmd(d);
          if (key >= monthStart && key <= monthEnd) count += 1;
        }
        return acc + count;
      }, 0);

      return {
        employee_code: emp.employee_code_4,
        employee_name: emp.name,
        work_days: calcWorkDays(logs ?? [], emp.id),
        paid_leave_days: paidLeaveDays,
        absence_days: 0,
        late_count: 0,
        early_leave_count: 0,
        overtime_hours: calcOvertimeHours(logs ?? [], emp.id),
      };
    });

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        month: targetMonth,
        rows: demoPayrollRows(),
        isDemo: true,
        note: "勤怠データが未登録のためデモデータを表示しています。",
      });
    }

    return NextResponse.json({
      ok: true,
      month: targetMonth,
      year,
      monthNum: month,
      rows,
      isDemo: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
