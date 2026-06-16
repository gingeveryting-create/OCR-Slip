import { apiError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { masterDataSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { supabase } = await requireProfile(["ADMIN"]);
    const { data, error } = await supabase.from("document_types").select("*").order("code");
    if (error) throw error;
    return ok({ documentTypes: data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireProfile(["ADMIN"]);
    const body = masterDataSchema.parse(await request.json());
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("document_types")
      .insert({ code: body.code, name: body.name, description: body.description ?? null, is_active: body.isActive })
      .select("*")
      .single();
    if (error) throw error;
    await writeAuditLog({ action: "DOCUMENT_TYPE_CREATED", newValue: data, performedBy: profile.id });
    return ok({ documentType: data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
