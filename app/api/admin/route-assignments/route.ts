import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PutPayload = {
  weekStart?: string;
  assignments?: Record<string, string>;
};

async function getTenantId() {
  const { data, error } = await supabaseAdmin
    .from("m_tenants")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("weekStart");
    if (!weekStart) return NextResponse.json({ ok: false, message: "weekStart が必要です。" }, { status: 400 });

    const tenantId = await getTenantId();
    const { data, error } = await supabaseAdmin
      .from("m_user_defined_values")
      .select("value_code,value_name")
      .eq("tenant_id", tenantId)
      .eq("group_code", "route_assignment")
      .limit(2000);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    const assignments: Record<string, string> = {};
    (data ?? []).forEach((row) => {
      const [w, routeId] = row.value_code.split(":");
      if (w === weekStart && routeId) assignments[routeId] = row.value_name;
    });
    return NextResponse.json({ ok: true, assignments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as PutPayload;
    const weekStart = body.weekStart?.trim();
    const assignments = body.assignments ?? {};
    if (!weekStart) return NextResponse.json({ ok: false, message: "weekStart が必要です。" }, { status: 400 });

    const tenantId = await getTenantId();
    const rows = Object.entries(assignments)
      .filter(([, employeeId]) => !!employeeId)
      .map(([routeId, employeeId]) => ({
        tenant_id: tenantId,
        group_code: "route_assignment",
        value_code: `${weekStart}:${routeId}`,
        value_name: employeeId,
        description: weekStart,
        display_order: 100,
        is_active: true,
      }));

    const { error: deleteError } = await supabaseAdmin
      .from("m_user_defined_values")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("group_code", "route_assignment")
      .eq("description", weekStart);
    if (deleteError) return NextResponse.json({ ok: false, message: deleteError.message }, { status: 500 });

    if (rows.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("m_user_defined_values").insert(rows);
      if (insertError) return NextResponse.json({ ok: false, message: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
