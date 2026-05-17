import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmployeePayload = {
  id?: string;
  employeeCode4?: string;
  name?: string;
  joinedOn?: string | null;
  isActive?: boolean;
  roleIds?: string[];
};

export async function GET() {
  try {
    const { data: employees, error: employeeError } = await supabaseAdmin
      .from("m_employees")
      .select("id,tenant_id,employee_code_4,name,line_user_id,is_active,joined_on")
      .order("employee_code_4", { ascending: true })
      .limit(1000);
    if (employeeError) return NextResponse.json({ ok: false, message: employeeError.message }, { status: 500 });

    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from("m_employee_role_assignments")
      .select("employee_id,role_id")
      .limit(5000);
    if (assignmentError) return NextResponse.json({ ok: false, message: assignmentError.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      rows: employees ?? [],
      assignments: assignments ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EmployeePayload;
    const employeeCode4 = body.employeeCode4?.trim();
    const name = body.name?.trim();
    const roleIds = body.roleIds ?? [];
    if (!employeeCode4 || !name) {
      return NextResponse.json({ ok: false, message: "employeeCode4/name が必要です。" }, { status: 400 });
    }

    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (tenantError) return NextResponse.json({ ok: false, message: tenantError.message }, { status: 500 });

    const { data: created, error: createError } = await supabaseAdmin
      .from("m_employees")
      .insert({
        tenant_id: tenantRow.id,
        employee_code_4: employeeCode4,
        name,
        joined_on: body.joinedOn || null,
        is_active: body.isActive ?? true,
      })
      .select("id,tenant_id")
      .single();
    if (createError) return NextResponse.json({ ok: false, message: createError.message }, { status: 500 });

    if (roleIds.length > 0) {
      const rows = roleIds.map((roleId) => ({
        tenant_id: tenantRow.id,
        employee_id: created.id,
        role_id: roleId,
      }));
      const { error: roleError } = await supabaseAdmin.from("m_employee_role_assignments").insert(rows);
      if (roleError) return NextResponse.json({ ok: false, message: roleError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as EmployeePayload;
    const id = body.id?.trim();
    const employeeCode4 = body.employeeCode4?.trim();
    const name = body.name?.trim();
    const roleIds = body.roleIds ?? [];
    if (!id || !employeeCode4 || !name) {
      return NextResponse.json({ ok: false, message: "id/employeeCode4/name が必要です。" }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabaseAdmin
      .from("m_employees")
      .select("id,tenant_id")
      .eq("id", id)
      .single();
    if (currentError) return NextResponse.json({ ok: false, message: currentError.message }, { status: 500 });

    const { error: updateError } = await supabaseAdmin
      .from("m_employees")
      .update({
        employee_code_4: employeeCode4,
        name,
        joined_on: body.joinedOn || null,
        is_active: body.isActive ?? true,
      })
      .eq("tenant_id", current.tenant_id)
      .eq("id", id);
    if (updateError) return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });

    const { error: deleteAssignError } = await supabaseAdmin
      .from("m_employee_role_assignments")
      .delete()
      .eq("tenant_id", current.tenant_id)
      .eq("employee_id", id);
    if (deleteAssignError) {
      return NextResponse.json({ ok: false, message: deleteAssignError.message }, { status: 500 });
    }

    if (roleIds.length > 0) {
      const rows = roleIds.map((roleId) => ({
        tenant_id: current.tenant_id,
        employee_id: id,
        role_id: roleId,
      }));
      const { error: insertAssignError } = await supabaseAdmin.from("m_employee_role_assignments").insert(rows);
      if (insertAssignError) {
        return NextResponse.json({ ok: false, message: insertAssignError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
