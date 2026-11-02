-- Reconcile payments reported on approved room assignment requests.
-- Earlier approval flows could create the initial invoice without recording
-- the amounts the tenant submitted. Add only the missing verified amount.
with approved_initials as (
  select
    invoice.id as invoice_id,
    request.tenant_id,
    greatest(0, coalesce(request.initial_payment_amount, 0))
      + greatest(0, coalesce(request.security_deposit_amount, 0)) as reported_paid,
    coalesce(to_char(request.payment_date, 'Mon DD, YYYY'), to_char(current_date, 'Mon DD, YYYY')) as payment_date,
    coalesce(request.payment_method, 'cash') as payment_method,
    coalesce(nullif(request.payment_reference, ''), 'INITIAL-RECONCILE-' || request.tenant_id) as reference_no,
    existing.received_by_user_id,
    coalesce(existing.total_paid, 0) as existing_paid
  from public.invoices invoice
  join public.leases lease on lease.id = invoice.lease_id and lease.status = 'active'
  join public.room_assignment_requests request on request.tenant_id = lease.tenant_id
  left join lateral (
    select
      sum(payment.amount_paid) as total_paid,
      (array_agg(payment.received_by_user_id order by payment.payment_date desc)
        filter (where payment.received_by_user_id is not null))[1] as received_by_user_id
    from public.payments payment
    where payment.invoice_id = invoice.id
  ) existing on true
  where invoice.invoice_type = 'initial'
    and request.status = 'approved'
    and request.payment_proof_status = 'approved'
), missing_payments as (
  select *, round(reported_paid - existing_paid, 2) as amount_missing
  from approved_initials
  where reported_paid > existing_paid
)
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
  'payment-initial-reconcile-' || invoice_id,
  invoice_id,
  amount_missing,
  'unallocated',
  payment_date,
  payment_method,
  reference_no,
  received_by_user_id,
  'Reconciled tenant-reported advance and security deposit from approved room request.'
from missing_payments
where amount_missing > 0
on conflict (id) do nothing;

update public.invoices invoice
set status = case
  when coalesce((
    select sum(payment.amount_paid)
    from public.payments payment
    where payment.invoice_id = invoice.id
  ), 0) >= invoice.total_amount then 'paid'
  when coalesce((
    select sum(payment.amount_paid)
    from public.payments payment
    where payment.invoice_id = invoice.id
  ), 0) > 0 then 'partial'
  else 'unpaid'
end
where invoice.invoice_type = 'initial'
  and exists (
    select 1
    from public.room_assignment_requests request
    join public.leases lease on lease.tenant_id = request.tenant_id and lease.id = invoice.lease_id
    where request.status = 'approved'
      and request.payment_proof_status = 'approved'
  );

notify pgrst, 'reload schema';