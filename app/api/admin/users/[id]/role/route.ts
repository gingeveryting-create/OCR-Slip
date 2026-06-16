import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { roleSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireProfile(["ADMIN"]);
    const body = roleSchema.parse(await request.json());
    const admin = createAdminSupabase();
    const { data: oldProfile } = await admin.from("profiles").select("*").eq("id", id).single();
    const { data, error } = await admin.from("profiles").update({ role: body.role }).eq("id", id).select("*").single();
    if (error) throw error;
    await writeAuditLog({
      action: "USER_ROLE_CHANGED",
      oldValue: oldProfile,
      newValue: data,
      performedBy: profile.id,
      remark: `role=${body.role}`
    });
    return ok({ user: data });
  } catch (error) {
    return apiError(error);
  }
}
