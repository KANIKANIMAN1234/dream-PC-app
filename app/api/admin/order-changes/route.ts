import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostPayload = {
  customer?: string;
  changeType?: string;
  targetFrom?: string;
  targetTo?: string;
  content?: string;
  memo?: string;
  mode?: "single" | "bulk";
  course?: string;
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
      .eq("group_code", "order_change_history")
      .order("created_at", { ascending: false })
      .limit(200);
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
        customer: row.value_name,
        changeType: String(payload.changeType ?? ""),
        targetFrom: String(payload.targetFrom ?? ""),
        targetTo: String(payload.targetTo ?? ""),
        content: String(payload.content ?? ""),
        memo: String(payload.memo ?? ""),
        mode: String(payload.mode ?? "single"),
        course: String(payload.course ?? ""),
        createdAt: String(payload.createdAt ?? row.created_at),
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
    const customer = body.customer?.trim();
    const changeType = body.changeType?.trim();
    const targetFrom = body.targetFrom?.trim();
    const targetTo = body.targetTo?.trim();
    const content = body.content?.trim();
    const memo = body.memo?.trim() ?? "";
    const mode = body.mode ?? "single";
    const course = body.course?.trim() ?? "";
    if (!changeType || !targetFrom || !content) {
      return NextResponse.json({ ok: false, message: "changeType/targetFrom/content が必要です。" }, { status: 400 });
    }
    if (mode === "single" && !customer) {
      return NextResponse.json({ ok: false, message: "single では customer が必要です。" }, { status: 400 });
    }
    if (mode === "bulk" && !course) {
      return NextResponse.json({ ok: false, message: "bulk では course が必要です。" }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const id = `chg-${Date.now()}`;
    const valueName = mode === "single" ? customer ?? "-" : `コース:${course}`;
    const description = JSON.stringify({
      changeType,
      targetFrom,
      targetTo: targetTo ?? targetFrom,
      content,
      memo,
      mode,
      course,
      createdAt: new Date().toISOString(),
    });

    const { error } = await supabaseAdmin.from("m_user_defined_values").insert({
      tenant_id: tenantId,
      group_code: "order_change_history",
      value_code: id,
      value_name: valueName,
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
