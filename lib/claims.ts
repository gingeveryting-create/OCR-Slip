import { getServerEnv } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

export async function getClaimDetail(id: string, profile: ProfileRow) {
  const admin = createAdminSupabase();
  const { data: claim, error } = await admin
    .from("expense_claims")
    .select("*, profiles(email,full_name,department), expense_attachments(*), audit_logs(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  if (profile.role === "EMPLOYEE" && claim.employee_id !== profile.id) {
    throw new Response("Forbidden", { status: 403 });
  }

  const attachment = claim.expense_attachments?.[0];
  let signedUrl: string | null = null;
  if (attachment?.file_path) {
    const env = getServerEnv();
    const { data } = await admin.storage.from(env.SUPABASE_STORAGE_BUCKET).createSignedUrl(attachment.file_path, 60 * 15);
    signedUrl = data?.signedUrl ?? null;
  }
  return { claim, signedUrl };
}
