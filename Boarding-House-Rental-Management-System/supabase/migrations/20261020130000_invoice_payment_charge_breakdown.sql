alter table public.payments
  add column if not exists charge_type text not null default 'unallocated';

alter table public.payments
  drop constraint if exists payments_charge_type_check,
  add constraint payments_charge_type_check
    check (charge_type in ('rent', 'utility', 'other', 'unallocated'));
