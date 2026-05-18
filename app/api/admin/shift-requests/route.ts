import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostPayload = {
  employeeId?: string;
  preferredDate?: string;
  preferredType?: string;
  reason?: string;
};

type PatchPayload = {
  id?: string;
  action?: "approved" | "rejected";
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
      .eq("group_code", "shift_request")
      .order("created_at", { ascending: false })
      .limit(300);
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
        employeeId: String(payload.employeeId ?? ""),
        employeeName: row.value_name,
        preferredDate: String(payload.preferredDate ?? ""),
        preferredType: String(payload.preferredType ?? ""),
        reason: String(payload.reason ?? ""),
        status: String(payload.status ?? "pending"),
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
    const employeeId = body.employeeId?.trim();
    const preferredDate = body.preferredDate?.trim();
    const preferredType = body.preferredType?.trim();
    const reason = body.reason?.trim() ?? "";
    if (!employeeId || !preferredDate || !preferredType) {
      return NextResponse.json({ ok: false, message: "employeeId/preferredDate/preferredType が必要です。" }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const { data: emp, error: empError } = await supabaseAdmin
      .from("m_employees")
      .select("id,name")
      .eq("tenant_id", tenantId)
      .eq("id", employeeId)
      .single();
    if (empError) return NextResponse.json({ ok: false, message: empError.message }, { status: 500 });

    const id = `shift-${Date.now()}`;
    const description = JSON.stringify({
      employeeId,
      preferredDate,
      preferredType,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    const { error } = await supabaseAdmin.from("m_user_defined_values").insert({
      tenant_id: tenantId,
      group_code: "shift_request",
      value_code: id,
      value_name: emp.name,
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
    if (!body.id || !body.action) {
      return NextResponse.json({ ok: false, message: "id/action が必要です。" }, { status: 400 });
    }
    const tenantId = await getTenantId();
    const { data: row, error: rowError } = await supabaseAdmin
      .from("m_user_defined_values")
      .select("description")
      .eq("tenant_id", tenantId)
      .eq("group_code", "shift_request")
      .eq("value_code", body.id)
      .single();
    if (rowError) return NextResponse.json({ ok: false, message: rowError.message }, { status: 500 });

    let payload: Record<string, unknown> = {};
    try {
      payload = row.description ? (JSON.parse(row.description) as Record<string, unknown>) : {};
    } catch {
      payload = {};
    }
    payload.status = body.action;
    payload.reviewedAt = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("m_user_defined_values")
      .update({ description: JSON.stringify(payload) })
      .eq("tenant_id", tenantId)
      .eq("group_code", "shift_request")
      .eq("value_code", body.id);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
