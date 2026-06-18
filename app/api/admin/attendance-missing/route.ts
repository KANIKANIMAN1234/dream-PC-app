import { NextResponse } from "next/server";
import { aggregateDayRows, getActiveTenantId, listApprovedLeaveDates, listAttendanceLogs } from "@/lib/attendance/fetch";
import { collectMissingPunches } from "@/lib/attendance/missing-punch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    if (!fromDate || !toDate) {
      return NextResponse.json({ ok: false, message: "fromDate/toDate が必要です。" }, { status: 400 });
    }

    const tenantId = await getActiveTenantId();
    const logs = await listAttendanceLogs(tenantId, fromDate, toDate);
    const leaveKeys = await listApprovedLeaveDates(tenantId, fromDate, toDate);
    const dayRows = aggregateDayRows(logs, leaveKeys);
    const issues = collectMissingPunches(dayRows);

    return NextResponse.json({ ok: true, fromDate, toDate, issues, dayRows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
