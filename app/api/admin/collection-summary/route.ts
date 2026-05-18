import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchPayload = {
  targetId?: string;
  status?: string;
  receivedAmount?: number;
  changeAmount?: number;
  method?: string;
  collectedBy?: string;
  memo?: string;
};

function monthRange(month: string) {
  const from = `${month}-01`;
  const base = new Date(`${month}-01T00:00:00`);
  base.setMonth(base.getMonth() + 1);
  base.setDate(0);
  const to = base.toISOString().slice(0, 10);
  return { from, to };
}

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

    const targetIds = (targets ?? []).map((row) => row.id);
    let resultMap = new Map<
      string,
      {
        status?: string;
        receivedAmount?: number;
        changeAmount?: number;
        method?: string;
        collectedBy?: string;
        memo?: string;
        collectedAt?: string;
      }
    >();
    if (targetIds.length > 0) {
      const { data: results, error: resultError } = await supabaseAdmin
        .from("m_user_defined_values")
        .select("value_code,description")
        .eq("tenant_id", tenantRow.id)
        .eq("group_code", "collection_result")
        .in("value_code", targetIds)
        .limit(2000);
      if (resultError) return NextResponse.json({ ok: false, message: resultError.message }, { status: 500 });
      resultMap = new Map(
        (results ?? []).map((row) => {
          let payload: Record<string, unknown> = {};
          try {
            payload = row.description ? (JSON.parse(row.description) as Record<string, unknown>) : {};
          } catch {
            payload = {};
          }
          return [
            row.value_code,
            {
              status: typeof payload.status === "string" ? payload.status : undefined,
              receivedAmount: Number(payload.receivedAmount ?? 0),
              changeAmount: Number(payload.changeAmount ?? 0),
              method: typeof payload.method === "string" ? payload.method : "",
              collectedBy: typeof payload.collectedBy === "string" ? payload.collectedBy : "",
              memo: typeof payload.memo === "string" ? payload.memo : "",
              collectedAt: typeof payload.collectedAt === "string" ? payload.collectedAt : "",
            },
          ];
        })
      );
    }

    const { from, to } = monthRange(billingMonth);
    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from("t_invoices")
      .select("customer_id,total_amount,paid_amount,invoice_date,status")
      .eq("tenant_id", tenantRow.id)
      .gte("invoice_date", from)
      .lte("invoice_date", to)
      .limit(5000);
    if (invoiceError) return NextResponse.json({ ok: false, message: invoiceError.message }, { status: 500 });
    const dueByCustomer = new Map<string, number>();
    (invoices ?? []).forEach((row) => {
      if (row.status === "canceled") return;
      const due = Math.max(0, Number(row.total_amount ?? 0) - Number(row.paid_amount ?? 0));
      dueByCustomer.set(row.customer_id, (dueByCustomer.get(row.customer_id) ?? 0) + due);
    });

    const rows = (targets ?? []).map((row) => ({
      id: row.id,
      billing_month: row.billing_month,
      status: resultMap.get(row.id)?.status ?? row.status,
      customer_id: row.customer_id,
      customer_code: customerMap.get(row.customer_id)?.customer_code ?? "-",
      customer_name: customerMap.get(row.customer_id)?.name ?? "-",
      due_amount: dueByCustomer.get(row.customer_id) ?? 0,
      received_amount: resultMap.get(row.id)?.receivedAmount ?? 0,
      change_amount: resultMap.get(row.id)?.changeAmount ?? 0,
      method: resultMap.get(row.id)?.method ?? "",
      collected_by: resultMap.get(row.id)?.collectedBy ?? "",
      memo: resultMap.get(row.id)?.memo ?? "",
      collected_at: resultMap.get(row.id)?.collectedAt ?? "",
    }));

    const total = rows.length;
    const pending = rows.filter((r) => r.status === "pending" || r.status === "none").length;
    const done = rows.filter((r) => r.status === "done").length;
    const absent = rows.filter((r) => r.status === "absent").length;

    return NextResponse.json({
      ok: true,
      billingMonth,
      rows,
      summary: { total, pending, done, absent },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as PatchPayload;
    if (!body.targetId || !body.status) {
      return NextResponse.json({ ok: false, message: "targetId/status が必要です。" }, { status: 400 });
    }
    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (tenantError) return NextResponse.json({ ok: false, message: tenantError.message }, { status: 500 });

    const { error: targetError } = await supabaseAdmin
      .from("t_collection_targets")
      .update({ status: body.status })
      .eq("tenant_id", tenantRow.id)
      .eq("id", body.targetId);
    if (targetError) return NextResponse.json({ ok: false, message: targetError.message }, { status: 500 });

    const description = JSON.stringify({
      status: body.status,
      receivedAmount: Number(body.receivedAmount ?? 0),
      changeAmount: Number(body.changeAmount ?? 0),
      method: body.method ?? "",
      collectedBy: body.collectedBy ?? "",
      memo: body.memo ?? "",
      collectedAt: new Date().toISOString(),
    });
    const { error: upsertError } = await supabaseAdmin.from("m_user_defined_values").upsert(
      {
        tenant_id: tenantRow.id,
        group_code: "collection_result",
        value_code: body.targetId,
        value_name: "collection",
        description,
        display_order: 100,
        is_active: true,
      },
      { onConflict: "tenant_id,group_code,value_code" }
    );
    if (upsertError) return NextResponse.json({ ok: false, message: upsertError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
