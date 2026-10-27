-- Starter property data for a fresh Supabase database.
-- Review the property details and rents before running this in the Dashboard.

insert into public.boarding_houses (id, name, address, default_kwh_rate, monthly_wifi_charge)
values ('bh-1', 'Nads & Gracy Boarding House', 'University Belt, Manila', 12.00, 100.00)
on conflict (id) do nothing;

insert into public.room_types (id, name, base_rent, max_capacity, description)
values
  ('type-single', 'Single Occupancy', 2500, 1, 'Private room with single bed and study desk'),
  ('type-double', 'Double Occupancy', 3500, 2, 'Shared room with bunk beds and shared closet')
on conflict (id) do nothing;

insert into public.rooms (id, house_id, room_number, type_id, status)
values
  ('room-1', 'bh-1', '01', 'type-single', 'vacant'),
  ('room-2', 'bh-1', '02', 'type-double', 'vacant'),
  ('room-3', 'bh-1', '03', 'type-single', 'vacant'),
  ('room-4', 'bh-1', '04', 'type-single', 'vacant'),
  ('room-5', 'bh-1', '05', 'type-double', 'vacant')
on conflict (id) do nothing;
