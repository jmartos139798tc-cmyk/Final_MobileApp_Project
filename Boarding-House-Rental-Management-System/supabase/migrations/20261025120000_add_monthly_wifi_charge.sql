alter table public.boarding_houses
  add column if not exists monthly_wifi_charge numeric(10, 2) not null default 100
  check (monthly_wifi_charge >= 0);
