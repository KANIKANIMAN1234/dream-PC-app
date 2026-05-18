import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostPayload = {
  flyerName?: string;
  vendorName?: string;
  dueDate?: string;
  qty?: number;
};

type PatchPayload = {
  id?: string;
  status?: "draft" | "ordered" | "delivered";
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
      .select("value_code,value_name,description,created_at")
      .eq("tenant_id", tenantId)
      .eq("group_code", "special_order")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    const rows = (data ?? []).map((row) => {
      let payload: { vendorName?: string; dueDate?: string; qty?: number; status?: string } = {};
      try {
        payload = row.description ? JSON.parse(row.description) : {};
      } catch {
        payload = {};
      }
      return {
        id: row.value_code,
        flyerName: row.value_name,
        vendorName: payload.vendorName ?? "",
        dueDate: payload.dueDate ?? "",
        qty: Number(payload.qty ?? 0),
        status: (payload.status ?? "draft") as "draft" | "ordered" | "delivered",
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
    const flyerName = body.flyerName?.trim();
    const vendorName = body.vendorName?.trim();
    const dueDate = body.dueDate?.trim();
    const qty = Number(body.qty ?? 0);
    if (!flyerName || !vendorName || !dueDate || !(qty > 0)) {
      return NextResponse.json({ ok: false, message: "flyerName/vendorName/dueDate/qty が必要です。" }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const id = `so-${Date.now()}`;
    const description = JSON.stringify({ vendorName, dueDate, qty, status: "draft" });
    const { error } = await supabaseAdmin.from("m_user_defined_values").insert({
      tenant_id: tenantId,
      group_code: "special_order",
      value_code: id,
      value_name: flyerName,
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

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as PatchPayload;
    if (!body.id || !body.status) {
      return NextResponse.json({ ok: false, message: "id/status が必要です。" }, { status: 400 });
    }
    const tenantId = await getTenantId();
    const { data: row, error: rowError } = await supabaseAdmin
      .from("m_user_defined_values")
      .select("description")
      .eq("tenant_id", tenantId)
      .eq("group_code", "special_order")
      .eq("value_code", body.id)
      .single();
    if (rowError) return NextResponse.json({ ok: false, message: rowError.message }, { status: 500 });

    let payload: Record<string, unknown> = {};
    try {
      payload = row.description ? JSON.parse(row.description) : {};
    } catch {
      payload = {};
    }
    payload.status = body.status;

    const { error } = await supabaseAdmin
      .from("m_user_defined_values")
      .update({ description: JSON.stringify(payload) })
      .eq("tenant_id", tenantId)
      .eq("group_code", "special_order")
      .eq("value_code", body.id);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
