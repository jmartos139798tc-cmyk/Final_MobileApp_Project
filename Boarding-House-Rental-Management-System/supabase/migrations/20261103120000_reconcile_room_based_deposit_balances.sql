-- Reconcile active tenants' initial invoices to the room-based deposit amount.
-- Existing payments are preserved, so any unpaid deposit remainder stays due.
with room_deposits as (
  select
    invoice.id as invoice_id,
    lease.id as lease_id,
    round(coalesce(room_type.base_rent, 0) / greatest(coalesce(room_type.max_capacity, 1), 1), 2) as deposit_amount
  from public.invoices invoice
  join public.leases lease on lease.id = invoice.lease_id
  join public.rooms room on room.id = lease.room_id
  join public.room_types room_type on room_type.id = room.type_id
  where invoice.invoice_type = 'initial'
    and lease.status = 'active'
)
update public.leases lease
set security_deposit_amount = room_deposits.deposit_amount,
    security_deposit_paid = coalesce((
      select sum(payment.amount_paid)
      from public.payments payment
      where payment.invoice_id = room_deposits.invoice_id
    ), 0) >= coalesce((
      select invoice.rent_charge + room_deposits.deposit_amount
      from public.invoices invoice
      where invoice.id = room_deposits.invoice_id
    ), 0)
from room_deposits
where lease.id = room_deposits.lease_id;

-- Older approvals recorded the tenant's advance but did not separately record
-- the deposit amount submitted with the room request. Add that verified amount
-- as a deposit payment unless it was already included in an unallocated payment.
insert into public.payments (
  id,
  invoice_id,
  amount_paid,
  charge_type,
  payment_date,
  payment_method,
  reference_no,
  received_by_user_id,
  notes
)
select
  'payment-initial-security-deposit-' || invoice.id,
  invoice.id,
  request.security_deposit_amount,
  'security_deposit',
  coalesce(to_char(request.payment_date, 'Mon DD, YYYY'), to_char(current_date, 'Mon DD, YYYY')),
  coalesce(request.payment_method, 'cash'),
  coalesce(nullif(request.payment_reference, ''), 'INITIAL-DEPOSIT-' || lease.tenant_id),
  existing_payment.received_by_user_id,
  'Security deposit payment from the tenant room setup request.'
from public.invoices invoice
join public.leases lease on lease.id = invoice.lease_id
join public.room_assignment_requests request on request.tenant_id = lease.tenant_id
left join lateral (
  select payment.received_by_user_id
  from public.payments payment
  where payment.invoice_id = invoice.id
  order by payment.payment_date desc
  limit 1
) existing_payment on true
where invoice.invoice_type = 'initial'
  and lease.status = 'active'
  and request.security_deposit_amount > 0
  and not exists (
    select 1
    from public.payments payment
    where payment.invoice_id = invoice.id
      and payment.charge_type = 'security_deposit'
  )
  and not exists (
    select 1
    from public.payments payment
    where payment.invoice_id = invoice.id
      and payment.charge_type = 'unallocated'
    group by payment.invoice_id
    having sum(payment.amount_paid) >= invoice.rent_charge + request.security_deposit_amount
  )
on conflict (id) do nothing;

update public.leases lease
set security_deposit_paid = coalesce((
  select sum(payment.amount_paid)
  from public.payments payment
  join public.invoices invoice on invoice.id = payment.invoice_id
  where invoice.lease_id = lease.id
    and invoice.invoice_type = 'initial'
), 0) >= coalesce((
  select invoice.rent_charge + lease.security_deposit_amount
  from public.invoices invoice
  where invoice.lease_id = lease.id
    and invoice.invoice_type = 'initial'
  order by invoice.created_at
  limit 1
), 0)
where lease.status = 'active';

with room_deposits as (
  select
    invoice.id as invoice_id,
    invoice.security_deposit as previous_deposit,
    round(coalesce(room_type.base_rent, 0) / greatest(coalesce(room_type.max_capacity, 1), 1), 2) as deposit_amount
  from public.invoices invoice
  join public.leases lease on lease.id = invoice.lease_id
  join public.rooms room on room.id = lease.room_id
  join public.room_types room_type on room_type.id = room.type_id
  where invoice.invoice_type = 'initial'
    and lease.status = 'active'
)
update public.invoices invoice
set security_deposit = room_deposits.deposit_amount,
    total_amount = greatest(0, invoice.total_amount - coalesce(room_deposits.previous_deposit, 0) + room_deposits.deposit_amount),
    status = case
      when coalesce((
        select sum(payment.amount_paid)
        from public.payments payment
        where payment.invoice_id = invoice.id
      ), 0) >= greatest(0, invoice.total_amount - coalesce(room_deposits.previous_deposit, 0) + room_deposits.deposit_amount) then 'paid'
      when coalesce((
        select sum(payment.amount_paid)
        from public.payments payment
        where payment.invoice_id = invoice.id
      ), 0) > 0 then 'partial'
      else 'unpaid'
    end
from room_deposits
where invoice.id = room_deposits.invoice_id;

notify pgrst, 'reload schema';
