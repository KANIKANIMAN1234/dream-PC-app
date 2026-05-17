import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("m_employee_roles")
      .select("id,tenant_id,role_code,role_name,description,is_active,display_order")
      .order("display_order", { ascending: true });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { roleCode?: string; roleName?: string; description?: string };
    const roleCode = body.roleCode?.trim();
    const roleName = body.roleName?.trim();
    if (!roleCode || !roleName) {
      return NextResponse.json({ ok: false, message: "roleCode/roleName が必要です。" }, { status: 400 });
    }
    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (tenantError) return NextResponse.json({ ok: false, message: tenantError.message }, { status: 500 });

    const { error } = await supabaseAdmin.from("m_employee_roles").insert({
      tenant_id: tenantRow.id,
      role_code: roleCode,
      role_name: roleName,
      description: body.description?.trim() || null,
      is_system: false,
      is_active: true,
      display_order: 100,
    });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
