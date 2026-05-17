import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("t_attendance_correction_requests")
      .select("id,tenant_id,employee_id,request_type,target_date,target_event_type,requested_at_time,reason,status")
      .order("target_date", { ascending: false })
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

    const { data: row, error: rowError } = await supabaseAdmin
      .from("t_attendance_correction_requests")
      .select("id,tenant_id,employee_id,target_date,target_event_type,requested_at_time,status")
      .eq("id", body.requestId)
      .single();

    if (rowError) return NextResponse.json({ ok: false, message: rowError.message }, { status: 500 });
    if (row.status !== "pending") {
      return NextResponse.json({ ok: false, message: "この申請は既に処理済みです。" }, { status: 409 });
    }

    const reviewedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("t_attendance_correction_requests")
      .update({
        status: body.action,
        reviewed_by: body.reviewerEmployeeId ?? null,
        reviewed_at: reviewedAt,
      })
      .eq("tenant_id", row.tenant_id)
      .eq("id", body.requestId);
    if (updateError) return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });

    if (body.action === "approved" && row.requested_at_time) {
      const occurredAt = new Date(`${row.target_date}T${row.requested_at_time}Z`).toISOString();
      const { error: insertError } = await supabaseAdmin.from("t_attendance_logs").insert({
        tenant_id: row.tenant_id,
        employee_id: row.employee_id,
        event_type: row.target_event_type,
        occurred_at: occurredAt,
        input_channel: "terminal_only",
        terminal_id: "correction-approved",
      });
      if (insertError) {
        return NextResponse.json({ ok: false, message: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
