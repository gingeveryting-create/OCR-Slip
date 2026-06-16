import { createAdminSupabase } from "@/lib/supabase/server";

export async function writeAuditLog(input: {
  claimId?: string | null;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  performedBy: string;
  remark?: string | null;
}) {
  const supabase = createAdminSupabase();
  await supabase.from("audit_logs").insert({
    claim_id: input.claimId ?? null,
    action: input.action,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    performed_by: input.performedBy,
    remark: input.remark ?? null
  });
}
