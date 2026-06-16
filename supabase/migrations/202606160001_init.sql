create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  department text,
  role text not null default 'EMPLOYEE' check (role in ('EMPLOYEE','FINANCE','ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_types (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  claim_no text unique,
  employee_id uuid not null references public.profiles(id),
  expense_type_id uuid references public.expense_types(id),
  document_type text,
  merchant_name text,
  receipt_no text,
  tax_invoice_no text,
  receipt_date date,
  receipt_time text,
  total_amount numeric(12,2),
  amount_before_vat numeric(12,2),
  vat_amount numeric(12,2),
  tax_id text,
  branch_no text,
  address text,
  payment_method text,
  bank_name text,
  sender_name text,
  sender_account text,
  receiver_name text,
  receiver_account text,
  transaction_id text,
  reference_no text,
  qr_data text,
  currency text default 'THB',
  status text not null default 'DRAFT' check (status in ('DRAFT','OCR_PROCESSING','OCR_FAILED','EXTRACTED','SUBMITTED','FINANCE_REVIEW','APPROVED','REJECTED','PAID','CANCELLED')),
  confidence_score numeric(5,2),
  duplicate_score numeric(5,2),
  duplicate_warning jsonb,
  extracted_json jsonb,
  confirmed_json jsonb,
  reject_reason text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.expense_claims(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  mime_type text,
  file_hash text,
  storage_bucket text not null,
  public_url text,
  created_at timestamptz not null default now()
);

create table public.ocr_results (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.expense_claims(id) on delete cascade,
  provider text not null,
  status text not null,
  document_type text,
  confidence_score numeric(5,2),
  raw_text text,
  extracted_json jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid references public.expense_claims(id) on delete cascade,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  performed_by uuid references public.profiles(id),
  performed_at timestamptz not null default now(),
  remark text
);

create table public.claim_daily_counters (
  prefix text primary key,
  running_no integer not null
);

create index expense_claims_employee_idx on public.expense_claims(employee_id);
create index expense_claims_status_idx on public.expense_claims(status);
create index expense_claims_duplicate_idx on public.expense_claims(receipt_no, tax_invoice_no, transaction_id, reference_no);
create index expense_attachments_hash_idx on public.expense_attachments(file_hash);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger expense_claims_touch_updated_at before update on public.expense_claims for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'EMPLOYEE')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.next_claim_no(p_prefix text)
returns text language plpgsql security definer as $$
declare
  next_running integer;
begin
  insert into public.claim_daily_counters(prefix, running_no)
  values (p_prefix, 1)
  on conflict (prefix)
  do update set running_no = public.claim_daily_counters.running_no + 1
  returning running_no into next_running;

  return p_prefix || lpad(next_running::text, 4, '0');
end;
$$;

create or replace function public.current_role()
returns text language sql stable as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.expense_types enable row level security;
alter table public.document_types enable row level security;
alter table public.expense_claims enable row level security;
alter table public.expense_attachments enable row level security;
alter table public.ocr_results enable row level security;
alter table public.audit_logs enable row level security;

create policy "profile read self finance admin" on public.profiles
for select using (id = auth.uid() or public.current_role() in ('FINANCE','ADMIN'));

create policy "admin manage profiles" on public.profiles
for all using (public.current_role() = 'ADMIN') with check (public.current_role() = 'ADMIN');

create policy "master data readable" on public.expense_types for select using (auth.uid() is not null);
create policy "admin manage expense types" on public.expense_types for all using (public.current_role() = 'ADMIN') with check (public.current_role() = 'ADMIN');

create policy "document types readable" on public.document_types for select using (auth.uid() is not null);
create policy "admin manage document types" on public.document_types for all using (public.current_role() = 'ADMIN') with check (public.current_role() = 'ADMIN');

create policy "employee read own claims" on public.expense_claims
for select using (employee_id = auth.uid() or public.current_role() in ('FINANCE','ADMIN'));

create policy "employee insert own claims" on public.expense_claims
for insert with check (employee_id = auth.uid());

create policy "employee update editable own claims" on public.expense_claims
for update using (
  employee_id = auth.uid()
  and status in ('DRAFT','OCR_FAILED','EXTRACTED','REJECTED')
) with check (
  employee_id = auth.uid()
  and status in ('DRAFT','OCR_FAILED','EXTRACTED','REJECTED','SUBMITTED')
);

create policy "finance update claims" on public.expense_claims
for update using (public.current_role() in ('FINANCE','ADMIN')) with check (public.current_role() in ('FINANCE','ADMIN'));

create policy "admin manage claims" on public.expense_claims
for all using (public.current_role() = 'ADMIN') with check (public.current_role() = 'ADMIN');

create policy "attachments follow claim read" on public.expense_attachments
for select using (
  exists (
    select 1 from public.expense_claims c
    where c.id = claim_id and (c.employee_id = auth.uid() or public.current_role() in ('FINANCE','ADMIN'))
  )
);

create policy "employee insert own attachments" on public.expense_attachments
for insert with check (
  exists (
    select 1 from public.expense_claims c
    where c.id = claim_id and c.employee_id = auth.uid()
  )
);

create policy "admin manage attachments" on public.expense_attachments
for all using (public.current_role() = 'ADMIN') with check (public.current_role() = 'ADMIN');

create policy "ocr follows claim read" on public.ocr_results
for select using (
  exists (
    select 1 from public.expense_claims c
    where c.id = claim_id and (c.employee_id = auth.uid() or public.current_role() in ('FINANCE','ADMIN'))
  )
);

create policy "admin manage ocr" on public.ocr_results
for all using (public.current_role() = 'ADMIN') with check (public.current_role() = 'ADMIN');

create policy "audit readable by role or owner" on public.audit_logs
for select using (
  public.current_role() in ('FINANCE','ADMIN')
  or exists (
    select 1 from public.expense_claims c
    where c.id = claim_id and c.employee_id = auth.uid()
  )
);

create policy "admin insert audit" on public.audit_logs
for insert with check (public.current_role() = 'ADMIN' or performed_by = auth.uid());

insert into public.expense_types (code, name) values
('MEAL', 'Meals'),
('TRAVEL', 'Travel'),
('FUEL', 'Fuel'),
('HOTEL', 'Hotel'),
('SUPPLIES', 'Office Supplies')
on conflict (code) do nothing;

insert into public.document_types (code, name, description) values
('BANK_SLIP', 'Bank transfer slip', 'Bank or mobile banking transfer proof'),
('RECEIPT', 'General receipt', 'General receipt'),
('TAX_INVOICE_SHORT', 'Short tax invoice', 'Short-form Thai tax invoice'),
('TAX_INVOICE_FULL', 'Full tax invoice', 'Full Thai tax invoice'),
('RESTAURANT_RECEIPT', 'Restaurant receipt', 'Restaurant bill or receipt'),
('FUEL_RECEIPT', 'Fuel receipt', 'Fuel station receipt'),
('HOTEL_RECEIPT', 'Hotel receipt', 'Hotel folio or receipt'),
('TRAVEL_RECEIPT', 'Travel receipt', 'Travel ticket or booking receipt'),
('POS_RECEIPT', 'POS receipt', 'Point-of-sale receipt'),
('UNKNOWN', 'Unknown', 'Unclassified document')
on conflict (code) do nothing;
