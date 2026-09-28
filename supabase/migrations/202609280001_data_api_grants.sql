-- Data API grants are separate from RLS. Keep anonymous users out of all
-- application tables and expose only the operations used by signed-in users.
grant usage on schema public to authenticated, service_role;

grant select on table public.profiles to authenticated;
grant select on table public.expense_types to authenticated;
grant select on table public.document_types to authenticated;
grant select, insert, update on table public.expense_claims to authenticated;
grant select, insert on table public.expense_attachments to authenticated;
grant select on table public.ocr_results to authenticated;
grant select, insert on table public.audit_logs to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.expense_types,
  public.document_types,
  public.expense_claims,
  public.expense_attachments,
  public.ocr_results,
  public.audit_logs,
  public.claim_daily_counters
to service_role;

revoke all on table
  public.profiles,
  public.expense_types,
  public.document_types,
  public.expense_claims,
  public.expense_attachments,
  public.ocr_results,
  public.audit_logs,
  public.claim_daily_counters
from anon;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.next_claim_no(text) from public, anon, authenticated;
revoke execute on function public.current_role() from public, anon;

grant execute on function public.current_role() to authenticated;
grant execute on function public.next_claim_no(text) to service_role;
