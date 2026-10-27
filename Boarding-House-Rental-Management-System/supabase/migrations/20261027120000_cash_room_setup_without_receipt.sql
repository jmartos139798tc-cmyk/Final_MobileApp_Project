-- Cash room setup is verified by staff in person, so it does not need an
-- uploaded image. GCash setup still requires a tenant-owned receipt image.

drop policy if exists assignment_requests_tenant_create on public.room_assignment_requests;
create policy assignment_requests_tenant_create on public.room_assignment_requests
  for insert to authenticated
  with check (
    (select private.owns_tenant(tenant_id))
    and status = 'pending'
    and payment_proof_status = 'pending'
    and initial_payment_amount > 0
    and payment_date is not null
    and (
      (payment_method = 'cash' and (payment_proof_path is null or payment_proof_path like tenant_id || '/%'))
      or (payment_method = 'gcash' and payment_proof_path like tenant_id || '/%')
    )
  );

drop policy if exists assignment_requests_tenant_retry on public.room_assignment_requests;
create policy assignment_requests_tenant_retry on public.room_assignment_requests
  for update to authenticated
  using ((select private.owns_tenant(tenant_id)) and status in ('pending', 'rejected'))
  with check (
    (select private.owns_tenant(tenant_id))
    and status = 'pending'
    and payment_proof_status = 'pending'
    and initial_payment_amount > 0
    and payment_date is not null
    and (
      (payment_method = 'cash' and (payment_proof_path is null or payment_proof_path like tenant_id || '/%'))
      or (payment_method = 'gcash' and payment_proof_path like tenant_id || '/%')
    )
  );

create or replace function public.protect_tenant_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_property_staff()) then
    return new;
  end if;

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
      where request.tenant_id = old.id
        and request.status = 'pending'
        and request.payment_proof_status = 'pending'
        and request.initial_payment_amount > 0
        and request.payment_date is not null
        and (
          (request.payment_method = 'cash' and (request.payment_proof_path is null or request.payment_proof_path like old.id || '/%'))
          or (request.payment_method = 'gcash' and request.payment_proof_path like old.id || '/%')
        )
        and room.status = 'vacant'
    )
    and not exists (
      select 1 from public.leases lease
      where lease.tenant_id = old.id and lease.status = 'active'
    ) then
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
  from public.tenants tenant
  where tenant.id = p_tenant_id
  for update;

  if current_status is distinct from 'rejected' then
    raise exception 'This tenant application is no longer rejected';
  end if;

  if not exists (
    select 1
    from public.room_assignment_requests request
    join public.rooms room on room.id = request.requested_room_id
    where request.tenant_id = p_tenant_id
      and request.status = 'pending'
      and request.payment_proof_status = 'pending'
      and request.initial_payment_amount > 0
      and request.payment_date is not null
      and (
        (request.payment_method = 'cash' and (request.payment_proof_path is null or request.payment_proof_path like p_tenant_id || '/%'))
        or (request.payment_method = 'gcash' and request.payment_proof_path like p_tenant_id || '/%')
      )
      and room.status = 'vacant'
  ) then
    raise exception 'Submit a valid room choice and payment details before resubmitting';
  end if;

  if exists (
    select 1 from public.leases lease
    where lease.tenant_id = p_tenant_id and lease.status = 'active'
  ) then
    raise exception 'You already have an active room assignment';
  end if;

  update public.tenants
  set account_status = 'pending', rejected_at = null, rejection_reason = null
  where id = p_tenant_id;
end;
$$;

notify pgrst, 'reload schema';
