import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireProfile(["FINANCE", "ADMIN"]);
    const admin = createAdminSupabase();
    const { data: current, error: currentError } = await admin.from("expense_claims").select("*").eq("id", id).single();
    if (currentError) throw currentError;
    const { data, error } = await admin
      .from("expense_claims")
      .update({ status: "APPROVED", approved_by: profile.id, approved_at: new Date().toISOString(), reject_reason: null })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
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
