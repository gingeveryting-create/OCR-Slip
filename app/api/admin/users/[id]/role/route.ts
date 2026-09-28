import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { claimIdSchema, roleSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const id = claimIdSchema.parse((await params).id);
    const { profile } = await requireProfile(["ADMIN"]);
    await enforceRateLimit({ request, scope: "admin-role-change", subject: profile.id, limit: 60, windowSeconds: 3600 });
    const body = roleSchema.parse(await request.json());
    const admin = createAdminSupabase();
    const { data: oldProfile, error: oldProfileError } = await admin.from("profiles").select("*").eq("id", id).single();
    if (oldProfileError) throw oldProfileError;
    if (id === profile.id && body.role !== "ADMIN") {
      const { count, error: countError } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "ADMIN");
      if (countError) throw countError;
      if ((count ?? 0) <= 1) {
        return new Response(JSON.stringify({ error: "ไม่สามารถลดสิทธิ์ผู้ดูแลระบบคนสุดท้ายได้" }), {
          status: 409,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
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
