import { NextResponse } from "next/server";
import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { generateClaimNo } from "@/lib/claim-number";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { claimIdSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const submittableStatuses = ["EXTRACTED", "REJECTED"];

export async function POST(request: Request, { params }: Params) {
  try {
    const id = claimIdSchema.parse((await params).id);
    const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
    await enforceRateLimit({ request, scope: "claim-submit", subject: profile.id, limit: 30, windowSeconds: 3600 });
    const admin = createAdminSupabase();
    const { data: current, error: currentError } = await admin.from("expense_claims").select("*").eq("id", id).single();
    if (currentError) throw currentError;
    if (profile.role === "EMPLOYEE" && current.employee_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!submittableStatuses.includes(current.status)) {
      return NextResponse.json({ error: "Only extracted or rejected claims can be submitted" }, { status: 409 });
    }
    const claimNo = current.claim_no ?? (await generateClaimNo());
    const { data, error } = await admin
      .from("expense_claims")
      .update({ claim_no: claimNo, status: "SUBMITTED", reject_reason: null })
      .eq("id", id)
      .in("status", submittableStatuses)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "รายการถูกเปลี่ยนสถานะแล้ว กรุณารีเฟรชหน้า" }, { status: 409 });
    await writeAuditLog({
      claimId: id,
      action: "CLAIM_SUBMITTED",
      oldValue: { status: current.status },
      newValue: { status: "SUBMITTED", claimNo },
      performedBy: profile.id
    });
    return ok({ claim: data });
  } catch (error) {
    return apiError(error);
  }
}
