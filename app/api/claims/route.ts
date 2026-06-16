import { apiError, ok } from "@/lib/api";
import { requireProfile } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { profile, supabase } = await requireProfile(["EMPLOYEE", "ADMIN"]);
    let query = supabase
      .from("expense_claims")
      .select("*, expense_attachments(*)")
      .order("created_at", { ascending: false });
    if (profile.role === "EMPLOYEE") query = query.eq("employee_id", profile.id);
    const { data, error } = await query;
    if (error) throw error;
    return ok({ claims: data });
  } catch (error) {
    return apiError(error);
  }
}
