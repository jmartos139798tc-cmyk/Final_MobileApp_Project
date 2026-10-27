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

create or replace function public.protect_tenant_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_property_staff()) then return new; end if;
  if new.user_id <> (select auth.uid()) then
    raise exception 'Tenants may only update their own contact and name fields';
  end if;
  if (to_jsonb(new) - array['first_name', 'last_name', 'initials', 'phone', 'emergency_contact'])
    is not distinct from
    (to_jsonb(old) - array['first_name', 'last_name', 'initials', 'phone', 'emergency_contact']) then
    return new;
  end if;
  if old.account_status = 'rejected'
    and new.account_status = 'pending'
    and new.rejected_at is null
    and new.rejection_reason is null
    and (to_jsonb(new) - array[
      'first_name', 'last_name', 'initials', 'phone', 'emergency_contact',
      'account_status', 'rejected_at', 'rejection_reason'
    ]) is not distinct from (to_jsonb(old) - array[
      'first_name', 'last_name', 'initials', 'phone', 'emergency_contact',
      'account_status', 'rejected_at', 'rejection_reason'
    ])
    and exists (
      select 1
      from public.room_assignment_requests request
      join public.rooms room on room.id = request.requested_room_id
      left join public.room_types rt on rt.id = room.type_id
      where request.tenant_id = old.id
        and request.status = 'pending'
        and request.payment_proof_status = 'pending'
        and request.initial_payment_amount > 0
        and request.payment_date is not null
        and ((request.payment_method = 'cash' and (request.payment_proof_path is null or request.payment_proof_path like old.id || '/%'))
          or (request.payment_method = 'gcash' and request.payment_proof_path like old.id || '/%'))
        and room.status in ('vacant', 'occupied')
        and (select count(*) from public.leases l where l.room_id = room.id and l.status = 'active') < greatest(coalesce(rt.max_capacity, 1), 1)
    )
    and not exists (select 1 from public.leases lease where lease.tenant_id = old.id and lease.status = 'active') then
    return new;
  end if;
  raise exception 'Tenants may only update their own contact and name fields, or resubmit a rejected application with a valid room request';
end;
$$;

create or replace function public.resubmit_rejected_tenant_application(p_tenant_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  if not (select private.owns_tenant(p_tenant_id)) then
    raise exception 'You may only resubmit your own tenant application';
  end if;
  select tenant.account_status into current_status
  from public.tenants tenant where tenant.id = p_tenant_id for update;
  if current_status is distinct from 'rejected' then
    raise exception 'This tenant application is no longer rejected';
  end if;
  if not exists (
    select 1
    from public.room_assignment_requests request
    join public.rooms room on room.id = request.requested_room_id
    left join public.room_types rt on rt.id = room.type_id
    where request.tenant_id = p_tenant_id
      and request.status = 'pending'
      and request.payment_proof_status = 'pending'
      and request.initial_payment_amount > 0
      and request.payment_date is not null
      and ((request.payment_method = 'cash' and (request.payment_proof_path is null or request.payment_proof_path like p_tenant_id || '/%'))
        or (request.payment_method = 'gcash' and request.payment_proof_path like p_tenant_id || '/%'))
      and room.status in ('vacant', 'occupied')
      and (select count(*) from public.leases l where l.room_id = room.id and l.status = 'active') < greatest(coalesce(rt.max_capacity, 1), 1)
  ) then
    raise exception 'Submit a valid room choice and payment details before resubmitting';
  end if;
  if exists (select 1 from public.leases lease where lease.tenant_id = p_tenant_id and lease.status = 'active') then
    raise exception 'You already have an active room assignment';
  end if;
  update public.tenants set account_status = 'pending', rejected_at = null, rejection_reason = null
  where id = p_tenant_id;
end;
$$;
