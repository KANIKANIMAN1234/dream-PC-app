import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostPayload = {
  itemCount?: number;
  totalQty?: number;
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

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const { data, error } = await supabaseAdmin
      .from("m_user_defined_values")
      .select("value_code,description,created_at")
      .eq("tenant_id", tenantId)
      .eq("group_code", "procurement_plan")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    const rows = (data ?? []).map((row) => {
      let payload: { itemCount?: number; totalQty?: number; createdAt?: string } = {};
      try {
        payload = row.description ? JSON.parse(row.description) : {};
      } catch {
        payload = {};
      }
      return {
        id: row.value_code,
        createdAt: payload.createdAt ?? row.created_at,
        itemCount: Number(payload.itemCount ?? 0),
        totalQty: Number(payload.totalQty ?? 0),
      };
    });
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostPayload;
    const itemCount = Number(body.itemCount ?? 0);
    const totalQty = Number(body.totalQty ?? 0);
    if (!(itemCount > 0) || !(totalQty > 0)) {
      return NextResponse.json({ ok: false, message: "itemCount/totalQty が必要です。" }, { status: 400 });
    }
    const tenantId = await getTenantId();
    const id = `po-${Date.now()}`;
    const description = JSON.stringify({
      itemCount,
      totalQty,
      createdAt: new Date().toISOString(),
    });
    const { error } = await supabaseAdmin.from("m_user_defined_values").insert({
      tenant_id: tenantId,
      group_code: "procurement_plan",
      value_code: id,
      value_name: "procurement",
      description,
      display_order: 100,
      is_active: true,
    });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
