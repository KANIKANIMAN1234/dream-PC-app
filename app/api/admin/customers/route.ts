import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("m_customers")
      .select("id,tenant_id,customer_code,name,phone,postal_code,address,line_user_id,status")
      .order("customer_code", { ascending: true })
      .limit(1000);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

type CustomerPayload = {
  id?: string;
  customerCode?: string;
  name?: string;
  phone?: string;
  postalCode?: string | null;
  address?: string | null;
  status?: "active" | "paused" | "canceled";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CustomerPayload;
    const customerCode = body.customerCode?.trim();
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const status = body.status ?? "active";
    if (!customerCode || !name || !phone) {
      return NextResponse.json(
        { ok: false, message: "customerCode/name/phone が必要です。" },
        { status: 400 }
      );
    }

    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (tenantError) return NextResponse.json({ ok: false, message: tenantError.message }, { status: 500 });

    const { data, error } = await supabaseAdmin
      .from("m_customers")
      .insert({
        tenant_id: tenantRow.id,
        customer_code: customerCode,
        name,
        phone,
        postal_code: body.postalCode?.trim() || null,
        address: body.address?.trim() || null,
        status,
      })
      .select("id,tenant_id,customer_code,name,phone,postal_code,address,line_user_id,status")
      .single();

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, row: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as CustomerPayload;
    const customerId = body.id?.trim();
    const customerCode = body.customerCode?.trim();
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const status = body.status ?? "active";
    if (!customerId || !customerCode || !name || !phone) {
      return NextResponse.json(
        { ok: false, message: "id/customerCode/name/phone が必要です。" },
        { status: 400 }
      );
    }

    const { data: current, error: currentError } = await supabaseAdmin
      .from("m_customers")
      .select("id,tenant_id")
      .eq("id", customerId)
      .single();
    if (currentError) return NextResponse.json({ ok: false, message: currentError.message }, { status: 500 });

    const { data, error } = await supabaseAdmin
      .from("m_customers")
      .update({
        customer_code: customerCode,
        name,
        phone,
        postal_code: body.postalCode?.trim() || null,
        address: body.address?.trim() || null,
        status,
      })
      .eq("tenant_id", current.tenant_id)
      .eq("id", customerId)
      .select("id,tenant_id,customer_code,name,phone,postal_code,address,line_user_id,status")
      .single();

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, row: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
