-- Approval serializes on the room row and checks the room type capacity.
-- A unique active lease per room incorrectly prevented double occupancy.
drop index if exists public.leases_one_active_per_room_uidx;
