-- Store the total monthly price for each room.
alter table public.rooms
  add column if not exists monthly_rent numeric(12, 2) check (monthly_rent is null or monthly_rent >= 0);

notify pgrst, 'reload schema';
