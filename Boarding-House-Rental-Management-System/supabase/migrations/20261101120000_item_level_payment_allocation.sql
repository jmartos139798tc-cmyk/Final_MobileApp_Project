-- Track each invoice payment against the specific billed item it settles.
alter table public.payments
  drop constraint if exists payments_charge_type_check;

update public.payments
set charge_type = 'electricity'
where charge_type = 'utility';

alter table public.payments
  add constraint payments_charge_type_check
    check (charge_type in ('rent', 'electricity', 'water', 'wifi', 'other', 'unallocated'));

alter table public.payment_proofs
  add column if not exists charge_type text not null default 'unallocated';

alter table public.payment_proofs
  drop constraint if exists payment_proofs_charge_type_check;

alter table public.payment_proofs
  add constraint payment_proofs_charge_type_check
    check (charge_type in ('rent', 'electricity', 'water', 'wifi', 'other', 'unallocated'));

notify pgrst, 'reload schema';
