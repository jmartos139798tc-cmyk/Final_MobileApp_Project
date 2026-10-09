-- The initial room choice and advance/deposit receipt belong to Supabase.
-- Firebase Auth remains the app's identity provider; Firebase UIDs are opaque
-- strings and therefore must not be constrained to Supabase UUID/profile rows.

alter table public.room_assignment_requests
  drop constraint if exists room_assignment_requests_tenant_id_fkey,
  drop constraint if exists room_assignment_requests_requested_room_id_fkey,
  drop constraint if exists room_assignment_requests_assigned_room_id_fkey,
  add column if not exists initial_payment_amount numeric(12, 2),
  add column if not exists payment_date date,
  add column if not exists payment_reference text not null default '',
  add column if not exists payment_proof_path text,
  add column if not exists payment_proof_status text not null default 'pending'
    check (payment_proof_status in ('pending', 'approved', 'rejected'));

-- RLS below is the authority for tenant edits. The older trigger depended on
-- auth.uid() UUID conversion and prevented Firebase UID based tenant requests.
drop trigger if exists protect_tenant_assignment_updates on public.room_assignment_requests;

create or replace function public.is_firebase_app_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    auth.jwt() ->> 'role' = 'authenticated'
    and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/boardinghouse-rental-mgt'
    and auth.jwt() ->> 'aud' = 'boardinghouse-rental-mgt',
    false
  );
$$;

create or replace function public.is_firebase_property_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.is_firebase_app_user()
    and auth.jwt() ->> 'app_role' in ('owner', 'landlord', 'caretaker');
$$;

create or replace function public.protect_firebase_assignment_request_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_firebase_property_staff() then
    return new;
  end if;

  if not public.is_firebase_app_user()
    or old.tenant_id <> 'tenant-' || (auth.jwt() ->> 'sub')
    or old.status not in ('pending', 'rejected')
    or (to_jsonb(new) - array[
      'requested_room_id', 'initial_payment_amount', 'payment_date',
      'payment_reference', 'payment_proof_path', 'payment_proof_status',
      'status', 'requested_at', 'updated_at'
    ]) is distinct from (to_jsonb(old) - array[
      'requested_room_id', 'initial_payment_amount', 'payment_date',
      'payment_reference', 'payment_proof_path', 'payment_proof_status',
      'status', 'requested_at', 'updated_at'
    ])
    or new.status <> 'pending'
    or new.tenant_id <> old.tenant_id
    or new.id <> old.id then
    raise exception 'Tenants may only resubmit their own pending room and payment setup';
  end if;

  return new;
end;
$$;

create trigger protect_firebase_assignment_request_updates
  before update on public.room_assignment_requests
  for each row execute function public.protect_firebase_assignment_request_updates();

drop policy if exists assignment_requests_read_own_or_staff on public.room_assignment_requests;
drop policy if exists assignment_requests_tenant_create on public.room_assignment_requests;
drop policy if exists assignment_requests_tenant_retry on public.room_assignment_requests;
drop policy if exists assignment_requests_staff_manage on public.room_assignment_requests;

create policy initial_setup_read_own_or_staff on public.room_assignment_requests
  for select to authenticated
  using (
    public.is_firebase_app_user()
    and (tenant_id = 'tenant-' || (auth.jwt() ->> 'sub') or public.is_firebase_property_staff())
  );

create policy initial_setup_tenant_create on public.room_assignment_requests
  for insert to authenticated
  with check (
    public.is_firebase_app_user()
    and tenant_id = 'tenant-' || (auth.jwt() ->> 'sub')
    and id = 'assignment-' || tenant_id
    and status = 'pending'
    and payment_proof_status = 'pending'
    and initial_payment_amount > 0
    and payment_date is not null
    and payment_proof_path like tenant_id || '/%'
  );

create policy initial_setup_tenant_retry on public.room_assignment_requests
  for update to authenticated
  using (
    public.is_firebase_app_user()
    and tenant_id = 'tenant-' || (auth.jwt() ->> 'sub')
    and status in ('pending', 'rejected')
  )
  with check (
    public.is_firebase_app_user()
    and tenant_id = 'tenant-' || (auth.jwt() ->> 'sub')
    and id = 'assignment-' || tenant_id
    and status = 'pending'
    and payment_proof_status = 'pending'
    and initial_payment_amount > 0
    and payment_date is not null
    and payment_proof_path like tenant_id || '/%'
  );

create policy initial_setup_staff_manage on public.room_assignment_requests
  for all to authenticated
  using (public.is_firebase_property_staff())
  with check (public.is_firebase_property_staff());

revoke all on function public.is_firebase_app_user() from public, anon;
revoke all on function public.is_firebase_property_staff() from public, anon;
revoke all on function public.protect_firebase_assignment_request_updates() from public, anon, authenticated;
grant execute on function public.is_firebase_app_user() to authenticated;
grant execute on function public.is_firebase_property_staff() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('initial-payment-proofs', 'initial-payment-proofs', false, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists initial_payment_proofs_tenant_upload on storage.objects;
drop policy if exists initial_payment_proofs_read_own_or_staff on storage.objects;

create policy initial_payment_proofs_tenant_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'initial-payment-proofs'
    and public.is_firebase_app_user()
    and (storage.foldername(name))[1] = 'tenant-' || (auth.jwt() ->> 'sub')
  );

create policy initial_payment_proofs_read_own_or_staff on storage.objects
  for select to authenticated
  using (
    bucket_id = 'initial-payment-proofs'
    and public.is_firebase_app_user()
    and (
      (storage.foldername(name))[1] = 'tenant-' || (auth.jwt() ->> 'sub')
      or public.is_firebase_property_staff()
    )
  );
