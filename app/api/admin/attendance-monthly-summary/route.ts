import { NextResponse } from "next/server";
import { getActiveTenantId, listActiveEmployees, listAttendanceLogs } from "@/lib/attendance/fetch";
import { buildMonthlyWorkSummaries } from "@/lib/attendance/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ ok: false, message: "year/month が必要です。" }, { status: 400 });
    }

    const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const tenantId = await getActiveTenantId();
    const employees = await listActiveEmployees(tenantId);
    const logs = await listAttendanceLogs(tenantId, fromDate, toDate);
    const summaries = buildMonthlyWorkSummaries(employees, logs);

    return NextResponse.json({ ok: true, year, month, summaries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
