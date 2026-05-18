import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function monthKey(ymd: string) {
  return ymd.slice(0, 7);
}

export async function GET() {
  try {
    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (tenantError) return NextResponse.json({ ok: false, message: tenantError.message }, { status: 500 });

    const from = new Date();
    from.setMonth(from.getMonth() - 6);
    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from("t_invoices")
      .select("invoice_date,total_amount,paid_amount,status")
      .eq("tenant_id", tenantRow.id)
      .gte("invoice_date", from.toISOString().slice(0, 10))
      .order("invoice_date", { ascending: true })
      .limit(5000);
    if (invoiceError) return NextResponse.json({ ok: false, message: invoiceError.message }, { status: 500 });

    const summaryByMonth = new Map<string, { billed: number; paid: number }>();
    let billedTotal = 0;
    let paidTotal = 0;
    let unpaidCount = 0;

    (invoices ?? []).forEach((row) => {
      const key = monthKey(row.invoice_date);
      const bucket = summaryByMonth.get(key) ?? { billed: 0, paid: 0 };
      bucket.billed += Number(row.total_amount ?? 0);
      bucket.paid += Number(row.paid_amount ?? 0);
      summaryByMonth.set(key, bucket);
      billedTotal += Number(row.total_amount ?? 0);
      paidTotal += Number(row.paid_amount ?? 0);
      if (row.status !== "paid") unpaidCount += 1;
    });

    const monthly = [...summaryByMonth.entries()].map(([month, val]) => ({
      month,
      billed: Math.round(val.billed),
      paid: Math.round(val.paid),
    }));

    return NextResponse.json({
      ok: true,
      monthly,
      totals: {
        billed: Math.round(billedTotal),
        paid: Math.round(paidTotal),
        unpaid: Math.max(0, Math.round(billedTotal - paidTotal)),
        unpaidCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
