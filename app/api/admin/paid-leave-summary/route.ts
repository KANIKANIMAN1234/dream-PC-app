import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetweenInclusive(startYmd: string, endYmd: string) {
  const start = new Date(`${startYmd}T00:00:00Z`);
  const end = new Date(`${endYmd}T00:00:00Z`);
  const diff = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

function calcGrantedDays(joinedOn: string | null, year: number) {
  if (!joinedOn) return 10;
  const joined = new Date(`${joinedOn}T00:00:00Z`);
  const base = new Date(Date.UTC(year, 0, 1));
  const years = Math.max(0, base.getUTCFullYear() - joined.getUTCFullYear());
  return Math.min(20, 10 + years);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? new Date().getFullYear());
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ ok: false, message: "year の指定が不正です。" }, { status: 400 });
    }

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
      .select("id,name,joined_on,is_active")
      .eq("tenant_id", tenantRow.id)
      .order("employee_code_4", { ascending: true })
      .limit(1000);
    if (employeeError) return NextResponse.json({ ok: false, message: employeeError.message }, { status: 500 });

    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const { data: leaves, error: leaveError } = await supabaseAdmin
      .from("t_leave_requests")
      .select("employee_id,leave_type,start_date,end_date,status")
      .eq("tenant_id", tenantRow.id)
      .eq("status", "approved")
      .lte("start_date", to)
      .gte("end_date", from)
      .limit(5000);
    if (leaveError) return NextResponse.json({ ok: false, message: leaveError.message }, { status: 500 });

    const usedByEmployee = new Map<string, number>();
    (leaves ?? []).forEach((row) => {
      // Treat approved leave as paid-leave usage when no dedicated table exists.
      const isPaid =
        row.leave_type.includes("有休") ||
        row.leave_type.toLowerCase().includes("paid") ||
        row.leave_type.toLowerCase().includes("annual");
      if (!isPaid) return;
      const clippedStart = row.start_date < from ? from : row.start_date;
      const clippedEnd = row.end_date > to ? to : row.end_date;
      const days = daysBetweenInclusive(clippedStart, clippedEnd);
      usedByEmployee.set(row.employee_id, (usedByEmployee.get(row.employee_id) ?? 0) + days);
    });

    const rows = (employees ?? []).map((emp) => {
      const grantedDays = calcGrantedDays(emp.joined_on, year);
      const usedDays = usedByEmployee.get(emp.id) ?? 0;
      const remainingDays = Math.max(0, grantedDays - usedDays);
      const mandatoryProgress = Math.min(5, usedDays);
      return {
        employee_id: emp.id,
        employee_name: emp.name,
        is_active: emp.is_active,
        granted_days: grantedDays,
        used_days: usedDays,
        remaining_days: remainingDays,
        mandatory_progress: mandatoryProgress,
      };
    });

    return NextResponse.json({
      ok: true,
      year,
      rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
