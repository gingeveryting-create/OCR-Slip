import { createAdminSupabase } from "@/lib/supabase/server";

export async function generateClaimNo() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const prefix = `CLM${yyyy}${mm}${dd}`;
  const supabase = createAdminSupabase();

  const { data, error } = await supabase.rpc("next_claim_no", { p_prefix: prefix });
  if (error) throw error;
  return data as string;
}
