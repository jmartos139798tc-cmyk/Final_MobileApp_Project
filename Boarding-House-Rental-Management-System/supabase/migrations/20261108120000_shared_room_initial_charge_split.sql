-- When a second tenant joins a shared room, split any unpaid initial advance
-- and deposit across the occupants. A first tenant who already paid both in
-- full keeps their existing invoice and the new tenant's deposit stays waived.
create or replace function public.split_unpaid_initial_charges_for_shared_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_capacity integer;
  existing_occupants integer;
  existing_initial_charges_paid boolean := false;
  occupant_initial_invoice record;
begin
  select greatest(coalesce(room_type.max_capacity, 1), 1)
  into room_capacity
  from public.rooms room
  left join public.room_types room_type on room_type.id = room.type_id
  where room.id = new.room_id;

  if coalesce(room_capacity, 1) <= 1 then
    return new;
  end if;

  select count(*)
  into existing_occupants
  from public.leases lease
  where lease.room_id = new.room_id
    and lease.status = 'active';

  if existing_occupants = 0 then
    return new;
  end if;

  select coalesce(payment_status.initial_charges_fully_paid, false)
  into existing_initial_charges_paid
  from public.get_double_room_initial_payment_status() payment_status
  where payment_status.room_id = new.room_id;

  if coalesce(existing_initial_charges_paid, false) then
    return new;
  end if;

  for occupant_initial_invoice in
    select invoice.id, invoice.rent_charge, invoice.security_deposit, invoice.total_amount
    from public.leases lease
    join public.invoices invoice on invoice.lease_id = lease.id
    where lease.room_id = new.room_id
      and lease.status = 'active'
      and lease.tenant_id <> new.tenant_id
      and invoice.invoice_type = 'initial'
    for update of invoice
  loop
    update public.invoices invoice
    set rent_charge = coalesce(new.agreed_monthly_rent, 0),
        security_deposit = coalesce(new.security_deposit_amount, 0),
        total_amount = greatest(
          0,
          coalesce(invoice.total_amount, 0)
            - coalesce(invoice.rent_charge, 0)
            - coalesce(invoice.security_deposit, 0)
            + coalesce(new.agreed_monthly_rent, 0)
            + coalesce(new.security_deposit_amount, 0)
        ),
        status = case
          when coalesce((
            select sum(payment.amount_paid)
            from public.payments payment
            where payment.invoice_id = invoice.id
          ), 0) >= greatest(
            0,
            coalesce(invoice.total_amount, 0)
              - coalesce(invoice.rent_charge, 0)
              - coalesce(invoice.security_deposit, 0)
              + coalesce(new.agreed_monthly_rent, 0)
              + coalesce(new.security_deposit_amount, 0)
          ) then 'paid'
          when coalesce((
            select sum(payment.amount_paid)
            from public.payments payment
            where payment.invoice_id = invoice.id
          ), 0) > 0 then 'partial'
          else 'unpaid'
        end
    where invoice.id = occupant_initial_invoice.id;

    update public.leases lease
    set agreed_monthly_rent = coalesce(new.agreed_monthly_rent, 0),
        security_deposit_amount = coalesce(new.security_deposit_amount, 0),
        security_deposit_paid = coalesce(new.security_deposit_amount, 0) <= 0
          or coalesce((
            select sum(payment.amount_paid)
            from public.payments payment
            where payment.invoice_id = occupant_initial_invoice.id
              and payment.charge_type = 'security_deposit'
          ), 0)
          + least(
              greatest(
                coalesce((
                  select sum(payment.amount_paid)
                  from public.payments payment
                  where payment.invoice_id = occupant_initial_invoice.id
                    and (payment.charge_type is null or payment.charge_type = 'unallocated')
                ), 0)
                  - greatest(
                      coalesce(new.agreed_monthly_rent, 0)
                        - coalesce((
                            select sum(payment.amount_paid)
                            from public.payments payment
                            where payment.invoice_id = occupant_initial_invoice.id
                              and payment.charge_type = 'rent'
                          ), 0),
                      0
                    ),
                0
              ),
              coalesce(new.security_deposit_amount, 0)
            ) >= coalesce(new.security_deposit_amount, 0)
    where lease.room_id = new.room_id
      and lease.status = 'active'
      and lease.tenant_id <> new.tenant_id;
  end loop;

  return new;
end;
$$;

drop trigger if exists split_unpaid_initial_charges_for_shared_room on public.leases;
create trigger split_unpaid_initial_charges_for_shared_room
before insert on public.leases
for each row
execute function public.split_unpaid_initial_charges_for_shared_room();

revoke all on function public.split_unpaid_initial_charges_for_shared_room() from public, anon;

notify pgrst, 'reload schema';
