create table if not exists public.tenant_move_out_requests (
  id text primary key,
  tenant_id text not null references public.tenants (id) on delete cascade,
  requested_move_out_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_notes text
);

create index if not exists tenant_move_out_requests_tenant_created_idx
  on public.tenant_move_out_requests (tenant_id, created_at desc);

alter table public.tenant_move_out_requests enable row level security;

drop policy if exists "Tenants and staff can read move-out requests" on public.tenant_move_out_requests;
create policy "Tenants and staff can read move-out requests"
  on public.tenant_move_out_requests for select to authenticated
  using (
    exists (
      select 1 from public.tenants t
      where t.id = tenant_move_out_requests.tenant_id and t.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('landlord', 'owner', 'caretaker')
    )
  );

drop policy if exists "Tenants can request their own move-out" on public.tenant_move_out_requests;
create policy "Tenants can request their own move-out"
  on public.tenant_move_out_requests for insert to authenticated
  with check (
    status = 'pending'
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_move_out_requests.tenant_id and t.user_id = (select auth.uid())
    )
    and requested_move_out_date > current_date
  );

drop policy if exists "Staff can review move-out requests" on public.tenant_move_out_requests;
create policy "Staff can review move-out requests"
  on public.tenant_move_out_requests for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('landlord', 'owner', 'caretaker')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('landlord', 'owner', 'caretaker')
    )
  );

grant select, insert on public.tenant_move_out_requests to authenticated;
grant update on public.tenant_move_out_requests to authenticated;

create or replace function public.ensure_tenant_current_month_invoice(p_tenant_id text, p_billing_period text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lease public.leases%rowtype;
  v_room public.rooms%rowtype;
  v_period text := p_billing_period;
  v_period_start date;
  v_due_date date;
  v_wifi numeric(12, 2) := 0;
  v_electricity numeric(12, 2) := 0;
  v_occupants integer := 1;
  v_reading record;
begin
  if v_period !~ '^[0-9]{4}-[0-9]{2}$'
    or v_period <> to_char(now() at time zone 'Asia/Manila', 'YYYY-MM') then
    raise exception 'Only the current billing month can be invoiced';
  end if;
  v_period_start := to_date(v_period || '-01', 'YYYY-MM-DD');

  if not (
    exists (
      select 1 from public.tenants t
      where t.id = p_tenant_id and t.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('landlord', 'owner', 'caretaker')
    )
  ) then
    raise exception 'Not authorized to create this tenant invoice';
  end if;

  select * into v_lease
  from public.leases l
  where l.tenant_id = p_tenant_id and l.status = 'active'
  order by l.start_date desc
  limit 1;
  if not found or substring(v_lease.start_date from 1 for 7) >= v_period then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_lease.id || ':' || v_period));
  if exists (
    select 1 from public.invoices i
    where i.lease_id = v_lease.id and i.billing_period = v_period and i.invoice_type = 'monthly'
  ) then
    return;
  end if;

  select * into v_room from public.rooms r where r.id = v_lease.room_id;
  select coalesce(bh.monthly_wifi_charge, 100) into v_wifi
  from public.boarding_houses bh where bh.id = v_room.house_id;
  v_wifi := coalesce(v_wifi, 100);

  select count(*) into v_occupants from public.leases l
  where l.room_id = v_lease.room_id and l.status = 'active';
  v_occupants := greatest(v_occupants, 1);

  select greatest(0, ur.curr_kwh - ur.prev_kwh) * ur.rate_per_kwh as amount
  into v_reading
  from public.utility_readings ur
  where ur.room_id = v_lease.room_id and ur.billing_period = v_period
  order by ur.reading_date desc
  limit 1;
  if found then
    v_electricity := round(coalesce(v_reading.amount, 0) / v_occupants, 2);
  end if;

  v_due_date := make_date(
    extract(year from v_period_start)::integer,
    extract(month from v_period_start)::integer,
    least(greatest(v_lease.due_day_of_month, 1), extract(day from (v_period_start + interval '1 month - 1 day'))::integer)
  );

  insert into public.invoices (
    id, lease_id, billing_period, invoice_type, rent_charge, utility_charge,
    security_deposit, other_charges, additional_charges, total_amount,
    due_date, status, notes
  ) values (
    'invoice-auto-' || v_lease.id || '-' || v_period,
    v_lease.id,
    v_period,
    'monthly',
    v_lease.agreed_monthly_rent,
    v_electricity,
    0,
    v_wifi,
    case when v_wifi > 0 then jsonb_build_array(jsonb_build_object('id', 'wifi', 'label', 'Wi-Fi', 'amount', v_wifi)) else '[]'::jsonb end,
    v_lease.agreed_monthly_rent + v_electricity + v_wifi,
    to_char(v_due_date, 'Mon FMDD, YYYY'),
    'unpaid',
    v_period || ' monthly rent, electricity, and Wi-Fi'
  );
end;
$$;

revoke all on function public.ensure_tenant_current_month_invoice(text, text) from public;
grant execute on function public.ensure_tenant_current_month_invoice(text, text) to authenticated;

notify pgrst, 'reload schema';
