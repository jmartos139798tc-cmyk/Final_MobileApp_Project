-- Save the requested room's per-tenant monthly rent as the tenant's security deposit.
alter table public.room_assignment_requests
  add column if not exists security_deposit_amount numeric(12, 2) not null default 0
  check (security_deposit_amount >= 0);

update public.room_assignment_requests request
set security_deposit_amount = round(
  coalesce(room_type.base_rent, 0) / greatest(coalesce(room_type.max_capacity, 1), 1),
  2
)
from public.rooms room
left join public.room_types room_type on room_type.id = room.type_id
where request.requested_room_id = room.id
  and request.security_deposit_amount = 0;

-- Existing active tenants receive the same room-based deposit on their initial invoice.
update public.leases lease
set security_deposit_amount = lease.agreed_monthly_rent,
    security_deposit_paid = false
where lease.status = 'active'
  and lease.security_deposit_amount = 0;

update public.invoices invoice
set security_deposit = lease.security_deposit_amount,
    total_amount = invoice.total_amount + lease.security_deposit_amount,
    status = case
      when coalesce((
        select sum(payment.amount_paid)
        from public.payments payment
        where payment.invoice_id = invoice.id
      ), 0) >= invoice.total_amount + lease.security_deposit_amount then 'paid'
      when coalesce((
        select sum(payment.amount_paid)
        from public.payments payment
        where payment.invoice_id = invoice.id
      ), 0) > 0 then 'partial'
      else 'unpaid'
    end
from public.leases lease
where invoice.lease_id = lease.id
  and invoice.invoice_type = 'initial'
  and lease.status = 'active'
  and invoice.security_deposit = 0
  and lease.security_deposit_amount > 0;

alter table public.payments
  drop constraint if exists payments_charge_type_check;
alter table public.payments
  add constraint payments_charge_type_check
    check (charge_type in ('rent', 'electricity', 'water', 'wifi', 'other', 'security_deposit', 'unallocated'));

alter table public.payment_proofs
  drop constraint if exists payment_proofs_charge_type_check;
alter table public.payment_proofs
  add constraint payment_proofs_charge_type_check
    check (charge_type in ('rent', 'electricity', 'water', 'wifi', 'other', 'security_deposit', 'unallocated'));

notify pgrst, 'reload schema';
