import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { adminCreateUserSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { supabase } = await requireProfile(["ADMIN"]);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return ok({ users: data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  let createdUserId: string | undefined;

  try {
    const { profile } = await requireProfile(["ADMIN"]);
    await enforceRateLimit({
      request,
      scope: "admin-create-user",
      subject: profile.id,
      limit: 20,
      windowSeconds: 3600
    });
    const body = adminCreateUserSchema.parse(await request.json());
    const admin = createAdminSupabase();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: body.initialPassword,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName,
        department: body.department
      }
    });

    if (createError) {
      if (/already|registered|exists/i.test(createError.message)) {
        return Response.json({ error: "อีเมลนี้มีบัญชีอยู่แล้ว" }, { status: 409 });
      }
      throw createError;
    }
    if (!created.user) throw new Error("Supabase did not return the created user");
    createdUserId = created.user.id;

    const { data: createdProfile, error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: created.user.id,
        email: body.email.toLowerCase(),
        full_name: body.fullName,
        department: body.department || null,
        role: body.role
      })
      .select("id,email,full_name,department,role,created_at")
      .single();
    if (profileError) throw profileError;

    await writeAuditLog({
      action: "USER_CREATED",
      newValue: createdProfile,
      performedBy: profile.id,
      remark: `role=${body.role}`
    });

    return ok({ user: createdProfile }, { status: 201 });
  } catch (error) {
    if (createdUserId) {
      const admin = createAdminSupabase();
      const { error: cleanupError } = await admin.auth.admin.deleteUser(createdUserId);
      if (cleanupError) console.error("Failed to roll back created user", { message: cleanupError.message });
    }
    return apiError(error);
  }
}
