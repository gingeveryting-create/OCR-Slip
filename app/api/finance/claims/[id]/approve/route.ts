import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { claimIdSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const reviewableStatuses = ["SUBMITTED", "FINANCE_REVIEW"];

export async function POST(request: Request, { params }: Params) {
  try {
    const id = claimIdSchema.parse((await params).id);
    const { profile } = await requireProfile(["FINANCE", "ADMIN"]);
    await enforceRateLimit({ request, scope: "finance-decision", subject: profile.id, limit: 120, windowSeconds: 600 });
    const admin = createAdminSupabase();
    const { data: current, error: currentError } = await admin.from("expense_claims").select("*").eq("id", id).single();
    if (currentError) throw currentError;
    if (current.status === "APPROVED") return ok({ claim: current });
    if (!reviewableStatuses.includes(current.status)) {
      return new Response(JSON.stringify({ error: "อนุมัติได้เฉพาะรายการที่ส่งให้ Finance ตรวจ" }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { data, error } = await admin
      .from("expense_claims")
      .update({ status: "APPROVED", approved_by: profile.id, approved_at: new Date().toISOString(), reject_reason: null })
      .eq("id", id)
      .in("status", reviewableStatuses)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: "รายการถูกเปลี่ยนสถานะแล้ว กรุณารีเฟรชหน้า" }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
    await writeAuditLog({
      claimId: id,
      action: "CLAIM_APPROVED",
      oldValue: { status: current.status },
      newValue: { status: "APPROVED" },
      performedBy: profile.id
    });
    return ok({ claim: data });
  } catch (error) {
    return apiError(error);
  }
}
