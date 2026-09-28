import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { masterDataSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { supabase } = await requireProfile(["ADMIN"]);
    const { data, error } = await supabase.from("expense_types").select("*").order("code");
    if (error) throw error;
    return ok({ expenseTypes: data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireProfile(["ADMIN"]);
    await enforceRateLimit({ request, scope: "admin-master-data", subject: profile.id, limit: 60, windowSeconds: 3600 });
    const body = masterDataSchema.parse(await request.json());
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("expense_types")
      .insert({ code: body.code, name: body.name, is_active: body.isActive })
      .select("*")
      .single();
    if (error) throw error;
    await writeAuditLog({ action: "EXPENSE_TYPE_CREATED", newValue: data, performedBy: profile.id });
    return ok({ expenseType: data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
