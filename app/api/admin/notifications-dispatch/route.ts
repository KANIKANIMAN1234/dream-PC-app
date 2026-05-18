import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NoticeExtra = {
  body?: string;
  sendAt?: string;
  mode?: string;
  deliveredAt?: string;
  deliveryResult?: { attempted?: number; success?: number; skipped?: number; note?: string; failed?: number };
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

function authorizeDispatch(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const dispatchKey = process.env.NOTIFICATION_DISPATCH_KEY;

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const keyHeader = req.headers.get("x-dispatch-key") ?? "";
  const keyQuery = new URL(req.url).searchParams.get("key") ?? "";

  if (cronSecret && bearer === cronSecret) return true;
  if (dispatchKey && (keyHeader === dispatchKey || keyQuery === dispatchKey)) return true;
  if (!cronSecret && !dispatchKey) return true;
  return false;
}

async function executeDispatch() {
  const tenantId = await getTenantId();
  const now = new Date();
  const { data, error } = await supabaseAdmin
    .from("m_user_defined_values")
    .select("tenant_id,value_code,value_name,description")
    .eq("tenant_id", tenantId)
    .eq("group_code", "notice_history")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return { ok: false as const, status: 500, message: error.message };

  const dueRows = (data ?? []).filter((row) => {
    let extra: NoticeExtra = {};
    try {
      extra = row.description ? (JSON.parse(row.description) as NoticeExtra) : {};
    } catch {
      extra = {};
    }
    if (extra.mode !== "scheduled") return false;
    if (!extra.sendAt) return false;
    if (extra.deliveredAt) return false;
    const ts = new Date(extra.sendAt);
    if (Number.isNaN(ts.getTime())) return false;
    return ts.getTime() <= now.getTime();
  });

  let processed = 0;
  let updated = 0;
  for (const row of dueRows) {
    processed += 1;
    let extra: NoticeExtra = {};
    try {
      extra = row.description ? (JSON.parse(row.description) as NoticeExtra) : {};
    } catch {
      extra = {};
    }
    const text = (extra.body ?? "").trim();
    if (!text) continue;
    const recipients = await resolveRecipientLineIds(tenantId, row.value_name);
    const deliveryResult = await pushLineMessages(recipients, text);
    const nextExtra: NoticeExtra = {
      ...extra,
      deliveryResult,
      deliveredAt: new Date().toISOString(),
    };
    const { error: updateError } = await supabaseAdmin
      .from("m_user_defined_values")
      .update({ description: JSON.stringify(nextExtra) })
      .eq("tenant_id", tenantId)
      .eq("group_code", "notice_history")
      .eq("value_code", row.value_code);
    if (!updateError) updated += 1;
  }

  return { ok: true as const, status: 200, processed, updated };
}

export async function GET(req: Request) {
  try {
    if (!authorizeDispatch(req)) {
      return NextResponse.json({ ok: false, message: "dispatch key が不正です。" }, { status: 401 });
    }
    const result = await executeDispatch();
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json({ ok: true, processed: result.processed, updated: result.updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!authorizeDispatch(req)) {
      return NextResponse.json({ ok: false, message: "dispatch key が不正です。" }, { status: 401 });
    }
    const result = await executeDispatch();
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json({ ok: true, processed: result.processed, updated: result.updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
