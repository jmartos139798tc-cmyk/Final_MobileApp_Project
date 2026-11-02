create or replace function public.get_double_room_initial_payment_status()
returns table (
  room_id text,
  initial_charges_fully_paid boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    room.id as room_id,
    bool_and(coalesce(
      invoice.id is not null
      and coalesce(paid.rent_direct, 0)
        + least(coalesce(paid.unallocated, 0), greatest(coalesce(invoice.rent_charge, 0) - coalesce(paid.rent_direct, 0), 0))
          >= coalesce(invoice.rent_charge, 0)
      and coalesce(paid.deposit_direct, 0)
        + least(
            greatest(coalesce(paid.unallocated, 0) - greatest(coalesce(invoice.rent_charge, 0) - coalesce(paid.rent_direct, 0), 0), 0),
            greatest(coalesce(invoice.security_deposit, 0) - coalesce(paid.deposit_direct, 0), 0)
          )
          >= coalesce(invoice.security_deposit, 0),
      false
    )) as initial_charges_fully_paid
  from public.rooms room
  join public.room_types room_type on room_type.id = room.type_id and room_type.max_capacity > 1
  join public.leases lease on lease.room_id = room.id and lease.status = 'active'
  left join lateral (
    select initial_invoice.*
    from public.invoices initial_invoice
    where initial_invoice.lease_id = lease.id and initial_invoice.invoice_type = 'initial'
    order by initial_invoice.created_at desc
    limit 1
  ) invoice on true
  left join lateral (
    select
      coalesce(sum(payment.amount_paid) filter (where payment.charge_type = 'rent'), 0) as rent_direct,
      coalesce(sum(payment.amount_paid) filter (where payment.charge_type = 'security_deposit'), 0) as deposit_direct,
      coalesce(sum(payment.amount_paid) filter (where payment.charge_type is null or payment.charge_type = 'unallocated'), 0) as unallocated
    from public.payments payment
    where payment.invoice_id = invoice.id
  ) paid on true
  where (select auth.uid()) is not null
  group by room.id
$$;

revoke all on function public.get_double_room_initial_payment_status() from public, anon;
grant execute on function public.get_double_room_initial_payment_status() to authenticated;

notify pgrst, 'reload schema';
