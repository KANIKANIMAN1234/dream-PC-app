import { NextResponse } from "next/server";
import { DEFAULT_AGREEMENT_36_SETTINGS, evaluateAgreement36Alerts } from "@/lib/attendance/agreement-36";
import { getActiveTenantId, listActiveEmployees, listAttendanceLogs } from "@/lib/attendance/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fiscalYearStartForReference(referenceDate: string, startMonth: number, startDay: number) {
  const year = Number(referenceDate.slice(0, 4));
  const month = Number(referenceDate.slice(5, 7));
  const day = Number(referenceDate.slice(8, 10));
  const fiscalYear =
    month < startMonth || (month === startMonth && day < startDay) ? year - 1 : year;
  return `${fiscalYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const referenceDate = searchParams.get("referenceDate") ?? new Date().toISOString().slice(0, 10);
    const settings = DEFAULT_AGREEMENT_36_SETTINGS;

    const tenantId = await getActiveTenantId();
    const employees = await listActiveEmployees(tenantId);
    const fiscalStart = fiscalYearStartForReference(referenceDate, settings.startMonth, settings.startDay);
    const logs = await listAttendanceLogs(tenantId, fiscalStart, referenceDate);

    const result = evaluateAgreement36Alerts(employees, logs, settings, new Date(`${referenceDate}T12:00:00`));

    return NextResponse.json({
      ok: true,
      referenceDate,
      workDate: result.workDate,
      enabled: result.enabled,
      settings,
      alerts: result.alerts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
