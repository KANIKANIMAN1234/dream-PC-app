import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostPayload = {
  destination?: string;
  body?: string;
  sendAt?: string;
  mode?: "immediate" | "scheduled";
};

async function resolveRecipientLineIds(tenantId: string, destination: string) {
  if (destination === "顧客全員") {
    const { data, error } = await supabaseAdmin
      .from("m_customers")
      .select("line_user_id")
      .eq("tenant_id", tenantId)
      .not("line_user_id", "is", null)
      .limit(2000);
    if (error) throw error;
    return [...new Set((data ?? []).map((row) => row.line_user_id).filter((v): v is string => !!v))];
  }

  if (destination === "従業員全員") {
    const { data, error } = await supabaseAdmin
      .from("m_employees")
      .select("line_user_id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .not("line_user_id", "is", null)
      .limit(2000);
    if (error) throw error;
    return [...new Set((data ?? []).map((row) => row.line_user_id).filter((v): v is string => !!v))];
  }

  if (destination === "配達担当者") {
    const { data: roles, error: roleError } = await supabaseAdmin
      .from("m_employee_roles")
      .select("id")
      .eq("tenant_id", tenantId)
      .or("role_name.ilike.%配達%,role_code.ilike.%delivery%");
    if (roleError) throw roleError;
    const roleIds = (roles ?? []).map((row) => row.id);
    if (roleIds.length === 0) return [];

    const { data: assigns, error: assignError } = await supabaseAdmin
      .from("m_employee_role_assignments")
      .select("employee_id")
      .eq("tenant_id", tenantId)
      .in("role_id", roleIds)
      .limit(3000);
    if (assignError) throw assignError;
    const employeeIds = [...new Set((assigns ?? []).map((row) => row.employee_id))];
    if (employeeIds.length === 0) return [];

    const { data: employees, error: employeeError } = await supabaseAdmin
      .from("m_employees")
      .select("line_user_id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("id", employeeIds)
      .not("line_user_id", "is", null)
      .limit(2000);
    if (employeeError) throw employeeError;
    return [...new Set((employees ?? []).map((row) => row.line_user_id).filter((v): v is string => !!v))];
  }

  return [];
}

async function pushLineMessages(recipients: string[], text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return { attempted: 0, success: 0, skipped: recipients.length, failed: 0, note: "LINE_CHANNEL_ACCESS_TOKEN 未設定のため送信スキップ" };
  }
  let success = 0;
  let failed = 0;
  for (const to of recipients) {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text }],
      }),
    });
    if (res.ok) success += 1;
    else failed += 1;
  }
  return { attempted: recipients.length, success, skipped: 0, failed };
}

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
      .eq("group_code", "notice_history")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    const rows = (data ?? []).map((row) => {
      let extra: {
        body?: string;
        sendAt?: string;
        mode?: string;
        deliveredAt?: string;
        deliveryResult?: { attempted?: number; success?: number; skipped?: number; failed?: number; note?: string };
      } = {};
      try {
        extra = row.description ? JSON.parse(row.description) : {};
      } catch {
        extra = {};
      }
      return {
        id: row.value_code,
        destination: row.value_name,
        body: extra.body ?? "",
        sendAt: extra.sendAt ?? row.created_at,
        mode: extra.mode ?? "immediate",
        deliveredAt: extra.deliveredAt ?? null,
        deliveryResult: extra.deliveryResult ?? null,
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
    const destination = body.destination?.trim();
    const text = body.body?.trim();
    const sendAt = body.sendAt?.trim();
    const mode = body.mode ?? "immediate";
    if (!destination || !text || !sendAt) {
      return NextResponse.json({ ok: false, message: "destination/body/sendAt が必要です。" }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const id = `notice-${Date.now()}`;
    let deliveryResult: Record<string, unknown> = {};
    let deliveredAt: string | null = null;
    if (mode === "immediate") {
      const recipients = await resolveRecipientLineIds(tenantId, destination);
      deliveryResult = await pushLineMessages(recipients, text);
      deliveredAt = new Date().toISOString();
    }
    const description = JSON.stringify({ body: text, sendAt, mode, deliveryResult, deliveredAt });
    const { error } = await supabaseAdmin.from("m_user_defined_values").insert({
      tenant_id: tenantId,
      group_code: "notice_history",
      value_code: id,
      value_name: destination,
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
