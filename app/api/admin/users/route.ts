import { apiError, ok } from "@/lib/api";
import { requireProfile } from "@/lib/supabase/server";

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
