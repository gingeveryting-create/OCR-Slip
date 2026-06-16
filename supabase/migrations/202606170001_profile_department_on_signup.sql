create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, department, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    nullif(new.raw_user_meta_data->>'department', ''),
    'EMPLOYEE'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    department = excluded.department,
    role = coalesce(public.profiles.role, 'EMPLOYEE'),
    updated_at = now();
  return new;
end;
$$;
