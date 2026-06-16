insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

create policy "receipt owner uploads"
on storage.objects for insert
with check (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "receipt owner reads own files"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "finance admin reads receipt files"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and public.current_role() in ('FINANCE','ADMIN')
);

create policy "admin manages receipt files"
on storage.objects for all
using (
  bucket_id = 'receipts'
  and public.current_role() = 'ADMIN'
)
with check (
  bucket_id = 'receipts'
  and public.current_role() = 'ADMIN'
);
