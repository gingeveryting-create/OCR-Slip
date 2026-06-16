import { apiError, ok } from "@/lib/api";
import { requireProfile } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { supabase } = await requireProfile(["FINANCE", "ADMIN"]);
    const { data, error } = await supabase
      .from("expense_claims")
      .select("*, profiles(email,full_name,department), expense_attachments(*)")
      .in("status", ["SUBMITTED", "FINANCE_REVIEW", "APPROVED", "REJECTED", "PAID"])
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ok({ claims: data });
  } catch (error) {
    return apiError(error);
  }
}
