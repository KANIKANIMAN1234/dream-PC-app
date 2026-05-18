import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchPayload = {
  invoiceId?: string;
  status?: "unpaid" | "partial" | "paid" | "canceled";
};

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

    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from("t_invoices")
      .select("id,tenant_id,customer_id,invoice_no,invoice_date,total_amount,paid_amount,status")
      .eq("tenant_id", tenantRow.id)
      .order("invoice_date", { ascending: false })
      .limit(500);
    if (invoiceError) return NextResponse.json({ ok: false, message: invoiceError.message }, { status: 500 });

    const customerIds = [...new Set((invoices ?? []).map((row) => row.customer_id))];
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

    const rows = (invoices ?? []).map((row) => ({
      ...row,
      customer_code: customerMap.get(row.customer_id)?.customer_code ?? "-",
      customer_name: customerMap.get(row.customer_id)?.name ?? "-",
    }));
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as PatchPayload;
    if (!body.invoiceId || !body.status) {
      return NextResponse.json({ ok: false, message: "invoiceId/status が必要です。" }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabaseAdmin
      .from("t_invoices")
      .select("id,tenant_id")
      .eq("id", body.invoiceId)
      .single();
    if (currentError) return NextResponse.json({ ok: false, message: currentError.message }, { status: 500 });

    const { error } = await supabaseAdmin
      .from("t_invoices")
      .update({ status: body.status })
      .eq("tenant_id", current.tenant_id)
      .eq("id", body.invoiceId);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
