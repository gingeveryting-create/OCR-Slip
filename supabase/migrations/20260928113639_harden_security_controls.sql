begin;

-- All application writes go through authenticated Next.js routes using the
-- server-only service role. Browser clients only need read access.
revoke insert, update, delete on table public.expense_claims from authenticated;
revoke insert, update, delete on table public.expense_attachments from authenticated;
revoke insert, update, delete on table public.audit_logs from authenticated;

grant select on table public.expense_claims to authenticated;
grant select on table public.expense_attachments to authenticated;
grant select on table public.audit_logs to authenticated;

drop policy if exists "admin manage profiles" on public.profiles;
drop policy if exists "admin manage expense types" on public.expense_types;
drop policy if exists "admin manage document types" on public.document_types;
drop policy if exists "employee insert own claims" on public.expense_claims;
drop policy if exists "employee update editable own claims" on public.expense_claims;
drop policy if exists "finance update claims" on public.expense_claims;
drop policy if exists "admin manage claims" on public.expense_claims;
drop policy if exists "employee insert own attachments" on public.expense_attachments;
drop policy if exists "admin manage attachments" on public.expense_attachments;
drop policy if exists "admin manage ocr" on public.ocr_results;

-- Prevent new public-schema objects from silently becoming part of the API.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter table public.claim_daily_counters enable row level security;

-- Finance may inspect only claims that have entered the finance workflow.
drop policy if exists "employee read own claims" on public.expense_claims;
create policy "claims readable by owner or permitted role"
on public.expense_claims for select
to authenticated
using (
  employee_id = (select auth.uid())
  or public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'FINANCE'
    and status in ('SUBMITTED', 'FINANCE_REVIEW', 'APPROVED', 'REJECTED', 'PAID')
  )
);

drop policy if exists "attachments follow claim read" on public.expense_attachments;
create policy "attachments follow permitted claim read"
on public.expense_attachments for select
to authenticated
using (
  exists (
    select 1
    from public.expense_claims c
    where c.id = claim_id
      and (
        c.employee_id = (select auth.uid())
        or public.current_role() = 'ADMIN'
        or (
          public.current_role() = 'FINANCE'
          and c.status in ('SUBMITTED', 'FINANCE_REVIEW', 'APPROVED', 'REJECTED', 'PAID')
        )
      )
  )
);

drop policy if exists "ocr follows claim read" on public.ocr_results;
create policy "ocr follows permitted claim read"
on public.ocr_results for select
to authenticated
using (
  exists (
    select 1
    from public.expense_claims c
    where c.id = claim_id
      and (
        c.employee_id = (select auth.uid())
        or public.current_role() = 'ADMIN'
        or (
          public.current_role() = 'FINANCE'
          and c.status in ('SUBMITTED', 'FINANCE_REVIEW', 'APPROVED', 'REJECTED', 'PAID')
        )
      )
  )
);

drop policy if exists "finance admin reads receipt files" on storage.objects;
create policy "finance admin reads permitted receipt files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'receipts'
  and (
    public.current_role() = 'ADMIN'
    or (
      public.current_role() = 'FINANCE'
      and exists (
        select 1
        from public.expense_attachments a
        join public.expense_claims c on c.id = a.claim_id
        where a.file_path = name
          and c.status in ('SUBMITTED', 'FINANCE_REVIEW', 'APPROVED', 'REJECTED', 'PAID')
      )
    )
  )
);

-- Audit rows are written only by trusted server code. service_role bypasses RLS.
drop policy if exists "admin insert audit" on public.audit_logs;

create table if not exists public.api_rate_limits (
  rate_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (rate_key, window_start)
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key is null or length(p_key) < 8 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits (rate_key, window_start, request_count)
  values (p_key, v_window_start, 1)
  on conflict (rate_key, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;

  if random() < 0.01 then
    delete from public.api_rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
to service_role;

-- Harden privileged helper functions against search-path substitution.
alter function public.next_claim_no(text) set search_path = public, pg_temp;
alter function public.current_role() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;

commit;
