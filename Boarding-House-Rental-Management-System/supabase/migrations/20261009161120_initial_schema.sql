-- Initial relational schema for the boarding-house management app.
-- Business record IDs remain text so Firestore document IDs can be preserved.
-- Supabase Auth owns identity UUIDs; profiles.id replaces Firestore users/{uid}.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'tenant'
    check (role in ('tenant', 'landlord', 'owner', 'caretaker')),
  created_at text not null default (now() at time zone 'utc')::text
);
create unique index profiles_email_lower_uidx on public.profiles (lower(email));

create table public.boarding_houses (
  id text primary key,
  name text not null,
  address text not null default '',
  default_kwh_rate numeric(10, 2) not null default 0 check (default_kwh_rate >= 0),
  created_at text
);

create table public.room_types (
  id text primary key,
  name text not null,
  base_rent numeric(12, 2) not null default 0 check (base_rent >= 0),
  max_capacity integer not null default 1 check (max_capacity > 0),
  description text
);

create table public.rooms (
  id text primary key,
  house_id text not null references public.boarding_houses (id) on delete restrict,
  room_number text not null,
  type_id text references public.room_types (id) on delete set null,
  status text not null default 'vacant' check (status in ('occupied', 'vacant', 'maintenance')),
  reserved_for_name text,
  unique (house_id, room_number)
);

create table public.tenants (
  id text primary key,
  user_id uuid unique references public.profiles (id) on delete set null,
  first_name text not null,
  last_name text not null default '',
  initials text not null default '',
  phone text not null default '',
  emergency_contact text,
  avatar_color text not null default '#8b5cf6',
  account_status text not null default 'pending'
    check (account_status in ('pending', 'approved', 'rejected')),
  approved_at text,
  approved_by uuid references public.profiles (id) on delete set null,
  rejected_at text,
  rejection_reason text,
  registered_at text not null default (now() at time zone 'utc')::text
);
create index tenants_user_id_idx on public.tenants (user_id);
create index tenants_account_status_idx on public.tenants (account_status);

create table public.staff_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default ''
);

create table public.leases (
  id text primary key,
  tenant_id text not null references public.tenants (id) on delete restrict,
  room_id text not null references public.rooms (id) on delete restrict,
  start_date text not null,
  end_date text,
  agreed_monthly_rent numeric(12, 2) not null check (agreed_monthly_rent >= 0),
  due_day_of_month integer not null default 1 check (due_day_of_month between 1 and 31),
  security_deposit_amount numeric(12, 2) not null default 0 check (security_deposit_amount >= 0),
  security_deposit_paid boolean not null default false,
  status text not null default 'active' check (status in ('active', 'terminated'))
);
create index leases_tenant_id_idx on public.leases (tenant_id);
create index leases_room_id_idx on public.leases (room_id);

create table public.utility_readings (
  id text primary key,
  room_id text not null references public.rooms (id) on delete restrict,
  billing_period text not null,
  prev_kwh numeric(12, 3) not null default 0 check (prev_kwh >= 0),
  curr_kwh numeric(12, 3) not null default 0 check (curr_kwh >= 0),
  rate_per_kwh numeric(10, 2) not null default 0 check (rate_per_kwh >= 0),
  reading_date text not null
);
create index utility_readings_room_period_idx on public.utility_readings (room_id, billing_period);

create table public.invoices (
  id text primary key,
  lease_id text not null references public.leases (id) on delete restrict,
  billing_period text not null,
  invoice_type text not null default 'monthly' check (invoice_type in ('initial', 'monthly', 'final')),
  rent_charge numeric(12, 2) not null default 0 check (rent_charge >= 0),
  utility_charge numeric(12, 2) not null default 0 check (utility_charge >= 0),
  security_deposit numeric(12, 2) not null default 0 check (security_deposit >= 0),
  other_charges numeric(12, 2) not null default 0 check (other_charges >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  due_date text not null,
  status text not null default 'unpaid' check (status in ('paid', 'unpaid', 'partial')),
  created_at text not null default (now() at time zone 'utc')::text,
  notes text
);
create index invoices_lease_id_idx on public.invoices (lease_id);
create index invoices_status_idx on public.invoices (status);

create table public.payments (
  id text primary key,
  invoice_id text not null references public.invoices (id) on delete restrict,
  amount_paid numeric(12, 2) not null check (amount_paid > 0),
  payment_date text not null,
  payment_method text not null check (payment_method in ('cash', 'gcash')),
  reference_no text not null default '',
  received_by_user_id uuid references public.profiles (id) on delete set null,
  notes text
);
create index payments_invoice_id_idx on public.payments (invoice_id);

create table public.complaints (
  id text primary key,
  tenant_id text not null references public.tenants (id) on delete restrict,
  room_id text references public.rooms (id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'in-progress', 'resolved')),
  filed_at text not null default (now() at time zone 'utc')::text,
  resolved_at text
);
create index complaints_tenant_id_idx on public.complaints (tenant_id);
create index complaints_status_idx on public.complaints (status);

create table public.room_change_requests (
  id text primary key,
  tenant_id text not null references public.tenants (id) on delete restrict,
  current_room_id text not null references public.rooms (id) on delete restrict,
  requested_room_id text not null references public.rooms (id) on delete restrict,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  requested_at text not null default (now() at time zone 'utc')::text
);
create index room_change_requests_tenant_id_idx on public.room_change_requests (tenant_id);

create table public.due_date_extension_requests (
  id text primary key,
  tenant_id text not null references public.tenants (id) on delete restrict,
  invoice_id text not null references public.invoices (id) on delete restrict,
  current_due_date text not null,
  requested_due_date text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at text not null default (now() at time zone 'utc')::text
);
create index extension_requests_tenant_id_idx on public.due_date_extension_requests (tenant_id);
create index extension_requests_invoice_id_idx on public.due_date_extension_requests (invoice_id);

create table public.announcements (
  id text primary key,
  house_id text references public.boarding_houses (id) on delete set null,
  author_user_id uuid references public.profiles (id) on delete set null,
  category text not null default 'House Rules',
  title text not null,
  description text not null default '',
  created_at text not null default (now() at time zone 'utc')::text
);

create table public.tenant_notifications (
  id text primary key,
  tenant_id text not null references public.tenants (id) on delete cascade,
  type text not null check (type in ('approval', 'rejection', 'invoice_created', 'payment_recorded')),
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at text not null default (now() at time zone 'utc')::text,
  related_invoice_id text references public.invoices (id) on delete set null
);
create index tenant_notifications_tenant_created_idx on public.tenant_notifications (tenant_id, created_at desc);

create table public.payment_proofs (
  id text primary key,
  tenant_id text not null references public.tenants (id) on delete restrict,
  invoice_id text not null references public.invoices (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date text not null,
  payment_method text not null check (payment_method in ('cash', 'gcash', 'bank_transfer')),
  reference_no text not null default '',
  proof_image_url text not null default '',
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at text not null default (now() at time zone 'utc')::text,
  reviewed_at text,
  reviewed_by_user_id uuid references public.profiles (id) on delete set null,
  rejection_reason text
);
create index payment_proofs_tenant_id_idx on public.payment_proofs (tenant_id);
create index payment_proofs_status_idx on public.payment_proofs (status);

create table public.room_assignment_requests (
  id text primary key,
  tenant_id text not null references public.tenants (id) on delete cascade,
  requested_room_id text not null references public.rooms (id) on delete restrict,
  assigned_room_id text references public.rooms (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at text not null default (now() at time zone 'utc')::text,
  updated_at text,
  reviewed_at text,
  reviewed_by_user_id uuid references public.profiles (id) on delete set null,
  rejection_reason text,
  notes text
);
create index assignment_requests_tenant_id_idx on public.room_assignment_requests (tenant_id);
create index assignment_requests_status_idx on public.room_assignment_requests (status);

-- Auth users get a basic tenant profile on signup. Staff roles are assigned by
-- trusted administration after the account exists.
create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'tenant')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

-- SECURITY DEFINER helpers avoid recursive RLS checks when policies inspect
-- profile, tenant, lease, and invoice relationships.
create or replace function public.is_property_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('landlord', 'owner', 'caretaker')
  );
$$;

create or replace function public.owns_tenant(target_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenants t
    where t.id = target_tenant_id and t.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_lease(target_lease_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    where l.id = target_lease_id and t.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_invoice(target_invoice_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.invoices i
    join public.leases l on l.id = i.lease_id
    join public.tenants t on t.id = l.tenant_id
    where i.id = target_invoice_id and t.user_id = (select auth.uid())
  );
$$;

create or replace function public.protect_tenant_row_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.is_property_staff()) then
    return new;
  end if;

  if tg_table_name = 'tenant_notifications'
    and (to_jsonb(new) - 'read') is distinct from (to_jsonb(old) - 'read') then
    raise exception 'Tenants may only mark their own notifications as read';
  end if;

  if tg_table_name = 'room_assignment_requests'
    and (to_jsonb(new) - array['requested_room_id', 'status', 'updated_at'])
      is distinct from (to_jsonb(old) - array['requested_room_id', 'status', 'updated_at']) then
    raise exception 'Tenants may only retry their room request';
  end if;

  return new;
end;
$$;

create trigger protect_tenant_notification_updates
  before update on public.tenant_notifications
  for each row execute function public.protect_tenant_row_updates();
create trigger protect_tenant_assignment_updates
  before update on public.room_assignment_requests
  for each row execute function public.protect_tenant_row_updates();

revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.protect_tenant_row_updates() from public, anon, authenticated;
revoke all on function public.is_property_staff() from public, anon;
revoke all on function public.owns_tenant(text) from public, anon;
revoke all on function public.owns_lease(text) from public, anon;
revoke all on function public.owns_invoice(text) from public, anon;
grant execute on function public.is_property_staff() to authenticated;
grant execute on function public.owns_tenant(text) to authenticated;
grant execute on function public.owns_lease(text) to authenticated;
grant execute on function public.owns_invoice(text) to authenticated;

-- Explicit grants pair with RLS. No anonymous access is granted to app data.
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.profiles enable row level security;
alter table public.boarding_houses enable row level security;
alter table public.room_types enable row level security;
alter table public.rooms enable row level security;
alter table public.tenants enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.leases enable row level security;
alter table public.utility_readings enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.complaints enable row level security;
alter table public.room_change_requests enable row level security;
alter table public.due_date_extension_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.tenant_notifications enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.room_assignment_requests enable row level security;

create policy profiles_read_own_or_staff on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_property_staff()));
create policy profiles_staff_manage on public.profiles
  for all to authenticated
  using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy boarding_houses_read_authenticated on public.boarding_houses
  for select to authenticated using (true);
create policy boarding_houses_staff_manage on public.boarding_houses
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy room_types_read_authenticated on public.room_types
  for select to authenticated using (true);
create policy room_types_staff_manage on public.room_types
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy rooms_read_authenticated on public.rooms
  for select to authenticated using (true);
create policy rooms_staff_manage on public.rooms
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy tenants_read_own_or_staff on public.tenants
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_property_staff()));
create policy tenants_self_register on public.tenants
  for insert to authenticated
  with check (user_id = (select auth.uid()) and account_status = 'pending');
create policy tenants_staff_manage on public.tenants
  for all to authenticated
  using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy staff_profiles_read_self_or_staff on public.staff_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_property_staff()));
create policy staff_profiles_staff_manage on public.staff_profiles
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy leases_read_own_or_staff on public.leases
  for select to authenticated
  using ((select public.owns_tenant(tenant_id)) or (select public.is_property_staff()));
create policy leases_staff_manage on public.leases
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy utility_readings_staff_manage on public.utility_readings
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy invoices_read_own_or_staff on public.invoices
  for select to authenticated
  using ((select public.owns_lease(lease_id)) or (select public.is_property_staff()));
create policy invoices_staff_manage on public.invoices
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy payments_read_own_or_staff on public.payments
  for select to authenticated
  using ((select public.owns_invoice(invoice_id)) or (select public.is_property_staff()));
create policy payments_staff_manage on public.payments
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy complaints_read_own_or_staff on public.complaints
  for select to authenticated
  using ((select public.owns_tenant(tenant_id)) or (select public.is_property_staff()));
create policy complaints_tenant_create on public.complaints
  for insert to authenticated
  with check ((select public.owns_tenant(tenant_id)) and status = 'pending');
create policy complaints_staff_manage on public.complaints
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy room_changes_read_own_or_staff on public.room_change_requests
  for select to authenticated
  using ((select public.owns_tenant(tenant_id)) or (select public.is_property_staff()));
create policy room_changes_tenant_create on public.room_change_requests
  for insert to authenticated
  with check ((select public.owns_tenant(tenant_id)) and status = 'pending');
create policy room_changes_staff_manage on public.room_change_requests
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy extensions_read_own_or_staff on public.due_date_extension_requests
  for select to authenticated
  using ((select public.owns_tenant(tenant_id)) or (select public.is_property_staff()));
create policy extensions_tenant_create on public.due_date_extension_requests
  for insert to authenticated
  with check ((select public.owns_tenant(tenant_id)) and status = 'pending'
    and (select public.owns_invoice(invoice_id)));
create policy extensions_staff_manage on public.due_date_extension_requests
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy announcements_read_authenticated on public.announcements
  for select to authenticated using (true);
create policy announcements_staff_manage on public.announcements
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy notifications_read_own_or_staff on public.tenant_notifications
  for select to authenticated
  using ((select public.owns_tenant(tenant_id)) or (select public.is_property_staff()));
create policy notifications_mark_own_read on public.tenant_notifications
  for update to authenticated
  using ((select public.owns_tenant(tenant_id)))
  with check ((select public.owns_tenant(tenant_id)));
create policy notifications_staff_manage on public.tenant_notifications
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy payment_proofs_read_own_or_staff on public.payment_proofs
  for select to authenticated
  using ((select public.owns_tenant(tenant_id)) or (select public.is_property_staff()));
create policy payment_proofs_tenant_create on public.payment_proofs
  for insert to authenticated
  with check ((select public.owns_tenant(tenant_id)) and status = 'pending'
    and (select public.owns_invoice(invoice_id)));
create policy payment_proofs_staff_manage on public.payment_proofs
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));

create policy assignment_requests_read_own_or_staff on public.room_assignment_requests
  for select to authenticated
  using ((select public.owns_tenant(tenant_id)) or (select public.is_property_staff()));
create policy assignment_requests_tenant_create on public.room_assignment_requests
  for insert to authenticated
  with check ((select public.owns_tenant(tenant_id)) and status = 'pending');
create policy assignment_requests_tenant_retry on public.room_assignment_requests
  for update to authenticated
  using ((select public.owns_tenant(tenant_id)) and status in ('pending', 'rejected'))
  with check ((select public.owns_tenant(tenant_id)) and status = 'pending');
create policy assignment_requests_staff_manage on public.room_assignment_requests
  for all to authenticated using ((select public.is_property_staff()))
  with check ((select public.is_property_staff()));
