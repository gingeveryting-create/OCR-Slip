import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { rejectSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireProfile(["FINANCE", "ADMIN"]);
    const body = rejectSchema.parse(await request.json());
    const admin = createAdminSupabase();
    const { data: current, error: currentError } = await admin.from("expense_claims").select("*").eq("id", id).single();
    if (currentError) throw currentError;
    const { data, error } = await admin
      .from("expense_claims")
      .update({ status: "REJECTED", reject_reason: body.reason })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    await writeAuditLog({
      claimId: id,
      action: "CLAIM_REJECTED",
      oldValue: { status: current.status },
      newValue: { status: "REJECTED", reason: body.reason },
      performedBy: profile.id,
      remark: body.reason
    });
    return ok({ claim: data });
  } catch (error) {
    return apiError(error);
  }
}
