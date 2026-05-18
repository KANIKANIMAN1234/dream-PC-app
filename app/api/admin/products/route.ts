import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("m_tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (tenantError) return NextResponse.json({ ok: false, message: tenantError.message }, { status: 500 });

    const { data: categories, error: categoryError } = await supabaseAdmin
      .from("m_product_categories")
      .select("id,category_name")
      .eq("tenant_id", tenantRow.id)
      .limit(500);
    if (categoryError) return NextResponse.json({ ok: false, message: categoryError.message }, { status: 500 });
    const categoryMap = new Map((categories ?? []).map((row) => [row.id, row.category_name]));

    const { data: products, error: productError } = await supabaseAdmin
      .from("m_products")
      .select("id,product_code,product_name,product_category_id,unit_name,standard_unit_price,is_active")
      .eq("tenant_id", tenantRow.id)
      .order("display_order", { ascending: true })
      .limit(2000);
    if (productError) return NextResponse.json({ ok: false, message: productError.message }, { status: 500 });

    const rows = (products ?? []).map((row) => ({
      ...row,
      category_name: row.product_category_id ? categoryMap.get(row.product_category_id) ?? "-" : "-",
    }));
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
