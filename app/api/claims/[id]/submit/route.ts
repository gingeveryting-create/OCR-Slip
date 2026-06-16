import { NextResponse } from "next/server";
import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { generateClaimNo } from "@/lib/claim-number";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
    const admin = createAdminSupabase();
    const { data: current, error: currentError } = await admin.from("expense_claims").select("*").eq("id", id).single();
    if (currentError) throw currentError;
    if (profile.role === "EMPLOYEE" && current.employee_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!["EXTRACTED", "REJECTED"].includes(current.status)) {
      return NextResponse.json({ error: "Only extracted or rejected claims can be submitted" }, { status: 409 });
    }
    const claimNo = current.claim_no ?? (await generateClaimNo());
    const { data, error } = await admin
      .from("expense_claims")
      .update({ claim_no: claimNo, status: "SUBMITTED", reject_reason: null })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
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
