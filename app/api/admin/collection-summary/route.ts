import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const billingMonth = searchParams.get("billingMonth") ?? new Date().toISOString().slice(0, 7);

    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (tenantError) return NextResponse.json({ ok: false, message: tenantError.message }, { status: 500 });

    const { data: targets, error: targetError } = await supabaseAdmin
      .from("t_collection_targets")
      .select("id,customer_id,billing_month,status")
      .eq("tenant_id", tenantRow.id)
      .eq("billing_month", billingMonth)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (targetError) return NextResponse.json({ ok: false, message: targetError.message }, { status: 500 });

    const customerIds = [...new Set((targets ?? []).map((row) => row.customer_id))];
    let customerMap = new Map<string, { customer_code: string; name: string }>();
    if (customerIds.length > 0) {
      const { data: customers, error: customerError } = await supabaseAdmin
        .from("m_customers")
        .select("id,customer_code,name")
        .eq("tenant_id", tenantRow.id)
        .in("id", customerIds);
      if (customerError) return NextResponse.json({ ok: false, message: customerError.message }, { status: 500 });
      customerMap = new Map((customers ?? []).map((c) => [c.id, { customer_code: c.customer_code, name: c.name }]));
    }

    const rows = (targets ?? []).map((row) => ({
      id: row.id,
      billing_month: row.billing_month,
      status: row.status,
      customer_id: row.customer_id,
      customer_code: customerMap.get(row.customer_id)?.customer_code ?? "-",
      customer_name: customerMap.get(row.customer_id)?.name ?? "-",
    }));

    const total = rows.length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const done = total - pending;

    return NextResponse.json({
      ok: true,
      billingMonth,
      rows,
      summary: { total, pending, done },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
