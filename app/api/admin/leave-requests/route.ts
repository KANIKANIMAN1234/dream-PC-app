import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("t_leave_requests")
      .select("id,tenant_id,employee_id,leave_type,start_date,end_date,reason,status")
      .order("start_date", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      requestId?: string;
      action?: "approved" | "rejected";
      reviewerEmployeeId?: string;
    };

    if (!body.requestId || !body.action) {
      return NextResponse.json({ ok: false, message: "requestId/action が必要です。" }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabaseAdmin
      .from("t_leave_requests")
      .select("id,tenant_id,status")
      .eq("id", body.requestId)
      .single();
    if (currentError) return NextResponse.json({ ok: false, message: currentError.message }, { status: 500 });

    const { error } = await supabaseAdmin
      .from("t_leave_requests")
      .update({
        status: body.action,
        reviewed_by: body.reviewerEmployeeId ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("tenant_id", current.tenant_id)
      .eq("id", body.requestId)
      .eq("status", "pending");

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
