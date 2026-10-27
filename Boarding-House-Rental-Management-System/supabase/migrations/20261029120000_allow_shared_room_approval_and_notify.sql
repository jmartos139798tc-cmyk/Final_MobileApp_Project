create or replace function public.approve_tenant_application(
  p_tenant_id text,
  p_room_id text,
  p_lease jsonb,
  p_invoice jsonb,
  p_payment jsonb,
  p_notification jsonb,
  p_approved_at text,
  p_approved_by uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant_status text;
  room_status text;
  room_capacity integer;
  active_occupants integer;
  shared_utility numeric;
  rent_per_tenant numeric;
  new_tenant_name text;
  occupant record;
begin
  if not (select private.is_property_staff()) then
    raise exception 'Only property staff can approve tenant applications';
  end if;

  select t.account_status into tenant_status
  from public.tenants t where t.id = p_tenant_id for update;
  if tenant_status is distinct from 'pending' then
    raise exception 'Tenant application is no longer pending';
  end if;

  select r.status, greatest(coalesce(rt.max_capacity, 1), 1)
  into room_status, room_capacity
  from public.rooms r
  left join public.room_types rt on rt.id = r.type_id
  where r.id = p_room_id
  for update of r;
  if room_status is null then
    raise exception 'Room not found';
  end if;
  if room_status not in ('vacant', 'occupied') then
    raise exception 'Room is not available';
  end if;

  select count(*) into active_occupants
  from public.leases l
  where l.room_id = p_room_id and l.status = 'active';
  if active_occupants >= room_capacity then
    raise exception 'Room is full and cannot accept another tenant';
  end if;

  rent_per_tenant := coalesce((p_lease ->> 'agreed_monthly_rent')::numeric, 0);
  if active_occupants > 0 then
    select greatest(0, (r.curr_kwh - r.prev_kwh) * r.rate_per_kwh) / room_capacity
    into shared_utility
    from public.utility_readings r
    where r.room_id = p_room_id and r.billing_period = p_invoice ->> 'billing_period'
    limit 1;
    update public.leases
    set agreed_monthly_rent = rent_per_tenant
    where room_id = p_room_id and status = 'active';
    update public.invoices i
    set rent_charge = rent_per_tenant,
        utility_charge = coalesce(shared_utility, i.utility_charge / room_capacity),
        total_amount = i.total_amount - coalesce(i.rent_charge, 0) - coalesce(i.utility_charge, 0)
          + rent_per_tenant + coalesce(shared_utility, i.utility_charge / room_capacity)
    where i.lease_id in (select l.id from public.leases l where l.room_id = p_room_id and l.status = 'active')
      and i.invoice_type = 'monthly'
      and i.billing_period = p_invoice ->> 'billing_period';
  end if;

  update public.tenants
  set account_status = 'approved', approved_at = p_approved_at, approved_by = p_approved_by
  where id = p_tenant_id;

  insert into public.leases
  select (jsonb_populate_record(null::public.leases, p_lease)).*;

  insert into public.invoices
  select (jsonb_populate_record(null::public.invoices, p_invoice)).*;

  if p_payment is not null then
    insert into public.payments
    select (jsonb_populate_record(null::public.payments, p_payment)).*;
  end if;

  update public.rooms set status = 'occupied' where id = p_room_id;

  if active_occupants > 0 then
    select concat_ws(' ', t.first_name, t.last_name) into new_tenant_name
    from public.tenants t where t.id = p_tenant_id;
    for occupant in
      select t.id as tenant_id, r.room_number
      from public.leases l
      join public.tenants t on t.id = l.tenant_id
      join public.rooms r on r.id = l.room_id
      where l.room_id = p_room_id and l.status = 'active' and l.tenant_id <> p_tenant_id
    loop
      insert into public.tenant_notifications (id, tenant_id, type, title, message, read, created_at)
      values (
        format('notif-shared-%s-%s', p_tenant_id, occupant.tenant_id),
        occupant.tenant_id,
        'approval',
        'A tenant has joined your room',
        format('A new tenant, %s, has been assigned to Room %s. Monthly rent and electricity will be shared between the room occupants.', new_tenant_name, occupant.room_number),
        false,
        p_approved_at
      );
    end loop;
  end if;

  insert into public.tenant_notifications
  select (jsonb_populate_record(null::public.tenant_notifications, p_notification)).*;
end;
$$;

revoke all on function public.approve_tenant_application(text, text, jsonb, jsonb, jsonb, jsonb, text, uuid) from public, anon;
grant execute on function public.approve_tenant_application(text, text, jsonb, jsonb, jsonb, jsonb, text, uuid) to authenticated;
