alter table public.room_assignment_requests
  add column if not exists payment_method text not null default 'cash';

alter table public.room_assignment_requests
  drop constraint if exists room_assignment_requests_payment_method_check,
  add constraint room_assignment_requests_payment_method_check
    check (payment_method in ('cash', 'gcash'));

create or replace function public.protect_tenant_row_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_property_staff()) then
    return new;
  end if;

  if tg_table_name = 'tenant_notifications'
    and (to_jsonb(new) - array['read', 'dismissed'])
      is distinct from (to_jsonb(old) - array['read', 'dismissed']) then
    raise exception 'Tenants may only update their own notification read or dismissed state';
  end if;

  if tg_table_name = 'room_assignment_requests'
    and (to_jsonb(new) - array[
      'requested_room_id', 'initial_payment_amount', 'payment_method', 'payment_date',
      'payment_reference', 'payment_proof_path', 'payment_proof_status',
      'status', 'updated_at'
    ]) is distinct from (to_jsonb(old) - array[
      'requested_room_id', 'initial_payment_amount', 'payment_method', 'payment_date',
      'payment_reference', 'payment_proof_path', 'payment_proof_status',
      'status', 'updated_at'
    ]) then
    raise exception 'Tenants may only retry their own room request';
  end if;

  return new;
end;
$$;
