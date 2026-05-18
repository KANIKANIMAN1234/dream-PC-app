import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostPayload = {
  holidayDate?: string;
  holidayName?: string;
};

type PatchPayload = {
  id?: string;
  holidayDate?: string;
  holidayName?: string;
  isActive?: boolean;
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
      .select("value_code,value_name,description,is_active,created_at")
      .eq("tenant_id", tenantId)
      .eq("group_code", "holiday_master")
      .order("value_code", { ascending: true })
      .limit(500);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    const rows = (data ?? []).map((row) => {
      let payload: Record<string, unknown> = {};
      try {
        payload = row.description ? (JSON.parse(row.description) as Record<string, unknown>) : {};
      } catch {
        payload = {};
      }
      return {
        id: row.value_code,
        holidayDate: row.value_code,
        holidayName: row.value_name,
        memo: String(payload.memo ?? ""),
        isActive: !!row.is_active,
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
    const holidayDate = body.holidayDate?.trim();
    const holidayName = body.holidayName?.trim();
    if (!holidayDate || !holidayName) {
      return NextResponse.json({ ok: false, message: "holidayDate/holidayName が必要です。" }, { status: 400 });
    }
    const tenantId = await getTenantId();
    const { error } = await supabaseAdmin.from("m_user_defined_values").insert({
      tenant_id: tenantId,
      group_code: "holiday_master",
      value_code: holidayDate,
      value_name: holidayName,
      description: JSON.stringify({ createdAt: new Date().toISOString() }),
      display_order: 100,
      is_active: true,
    });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as PatchPayload;
    if (!body.id) {
      return NextResponse.json({ ok: false, message: "id が必要です。" }, { status: 400 });
    }
    const tenantId = await getTenantId();
    const updatePayload: Record<string, unknown> = {};
    if (typeof body.holidayName === "string") updatePayload.value_name = body.holidayName.trim();
    if (typeof body.isActive === "boolean") updatePayload.is_active = body.isActive;
    if (body.holidayDate && body.holidayDate.trim() !== body.id) updatePayload.value_code = body.holidayDate.trim();

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ ok: false, message: "更新項目がありません。" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("m_user_defined_values")
      .update(updatePayload)
      .eq("tenant_id", tenantId)
      .eq("group_code", "holiday_master")
      .eq("value_code", body.id);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
