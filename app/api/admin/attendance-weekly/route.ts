import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DayEvents = {
  start?: string;
  end?: string;
  out?: string;
  work?: string;
  leave?: boolean;
};

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toHm(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("weekStart");
    if (!weekStart) {
      return NextResponse.json({ ok: false, message: "weekStart が必要です。" }, { status: 400 });
    }
    const startDate = new Date(`${weekStart}T00:00:00Z`);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ ok: false, message: "weekStart の形式が不正です。" }, { status: 400 });
    }
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 7);

    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (tenantError) return NextResponse.json({ ok: false, message: tenantError.message }, { status: 500 });

    const { data: employees, error: employeeError } = await supabaseAdmin
      .from("m_employees")
      .select("id,name,is_active")
      .eq("tenant_id", tenantRow.id)
      .order("employee_code_4", { ascending: true })
      .limit(500);
    if (employeeError) return NextResponse.json({ ok: false, message: employeeError.message }, { status: 500 });

    const { data: logs, error: logError } = await supabaseAdmin
      .from("t_attendance_logs")
      .select("employee_id,event_type,occurred_at")
      .eq("tenant_id", tenantRow.id)
      .gte("occurred_at", startDate.toISOString())
      .lt("occurred_at", endDate.toISOString())
      .order("occurred_at", { ascending: true })
      .limit(5000);
    if (logError) return NextResponse.json({ ok: false, message: logError.message }, { status: 500 });

    const { data: leaves, error: leaveError } = await supabaseAdmin
      .from("t_leave_requests")
      .select("employee_id,start_date,end_date,status")
      .eq("tenant_id", tenantRow.id)
      .eq("status", "approved")
      .lte("start_date", toYmd(endDate))
      .gte("end_date", toYmd(startDate))
      .limit(1000);
    if (leaveError) return NextResponse.json({ ok: false, message: leaveError.message }, { status: 500 });

    const days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + idx);
      return toYmd(d);
    });

    const rowMap = new Map<string, { employee_id: string; employee_name: string; is_active: boolean; days: Record<string, DayEvents> }>();
    (employees ?? []).forEach((e) => {
      rowMap.set(e.id, {
        employee_id: e.id,
        employee_name: e.name,
        is_active: e.is_active,
        days: {},
      });
    });

    (logs ?? []).forEach((log) => {
      const row = rowMap.get(log.employee_id);
      if (!row) return;
      const dateKey = toYmd(new Date(log.occurred_at));
      const day = (row.days[dateKey] ??= {});
      const hm = toHm(log.occurred_at);
      if (log.event_type === "start") {
        if (!day.start || hm < day.start) day.start = hm;
      } else if (log.event_type === "end") {
        if (!day.end || hm > day.end) day.end = hm;
      } else if (log.event_type === "out") {
        if (!day.out || hm < day.out) day.out = hm;
      } else if (log.event_type === "work") {
        if (!day.work || hm < day.work) day.work = hm;
      }
    });

    (leaves ?? []).forEach((leave) => {
      const row = rowMap.get(leave.employee_id);
      if (!row) return;
      for (const day of days) {
        if (day >= leave.start_date && day <= leave.end_date) {
          const cell = (row.days[day] ??= {});
          cell.leave = true;
        }
      }
    });

    return NextResponse.json({
      ok: true,
      weekStart: toYmd(startDate),
      days,
      rows: [...rowMap.values()],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
