import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchPayload = {
  deliveryId?: string;
  routeId?: string;
  status?: string;
};

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deliveryDate = searchParams.get("deliveryDate") ?? todayYmd();

    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (tenantError) return NextResponse.json({ ok: false, message: tenantError.message }, { status: 500 });

    const { data: routes, error: routeError } = await supabaseAdmin
      .from("m_delivery_routes")
      .select("id,route_code,route_name,is_active")
      .eq("tenant_id", tenantRow.id)
      .order("route_code", { ascending: true })
      .limit(300);
    if (routeError) return NextResponse.json({ ok: false, message: routeError.message }, { status: 500 });

    const { data: deliveries, error: deliveryError } = await supabaseAdmin
      .from("t_deliveries")
      .select("id,route_id,customer_id,delivery_date,status")
      .eq("tenant_id", tenantRow.id)
      .eq("delivery_date", deliveryDate)
      .order("created_at", { ascending: true })
      .limit(2000);
    if (deliveryError) return NextResponse.json({ ok: false, message: deliveryError.message }, { status: 500 });

    const customerIds = [...new Set((deliveries ?? []).map((d) => d.customer_id))];
    const routeMap = new Map((routes ?? []).map((r) => [r.id, r]));
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

    const rows = (deliveries ?? []).map((d) => ({
      id: d.id,
      route_id: d.route_id,
      route_code: routeMap.get(d.route_id)?.route_code ?? "-",
      route_name: routeMap.get(d.route_id)?.route_name ?? "-",
      customer_id: d.customer_id,
      customer_code: customerMap.get(d.customer_id)?.customer_code ?? "-",
      customer_name: customerMap.get(d.customer_id)?.name ?? "-",
      delivery_date: d.delivery_date,
      status: d.status,
    }));

    return NextResponse.json({
      ok: true,
      deliveryDate,
      routes: routes ?? [],
      rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as PatchPayload;
    if (!body.deliveryId) {
      return NextResponse.json({ ok: false, message: "deliveryId が必要です。" }, { status: 400 });
    }
    if (!body.routeId && !body.status) {
      return NextResponse.json({ ok: false, message: "routeId または status を指定してください。" }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabaseAdmin
      .from("t_deliveries")
      .select("id,tenant_id")
      .eq("id", body.deliveryId)
      .single();
    if (currentError) return NextResponse.json({ ok: false, message: currentError.message }, { status: 500 });

    const patch: Record<string, string> = {};
    if (body.routeId) patch.route_id = body.routeId;
    if (body.status) patch.status = body.status;

    const { error } = await supabaseAdmin
      .from("t_deliveries")
      .update(patch)
      .eq("tenant_id", current.tenant_id)
      .eq("id", body.deliveryId);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
