alter table public.rooms
  add column if not exists has_private_bathroom boolean not null default false;

update public.room_types
set name = 'Standard Double Room',
    base_rent = 3500,
    max_capacity = 2,
    description = 'Double-occupancy room. Amenities are configured per room.'
where id = 'type-double';

insert into public.room_types (id, name, base_rent, max_capacity, description)
values (
  'type-premium-double',
  'Premium Double Room',
  5000,
  2,
  'Air-conditioned double-occupancy room with a private CR.'
)
on conflict (id) do update
set name = excluded.name,
    base_rent = excluded.base_rent,
    max_capacity = excluded.max_capacity,
    description = excluded.description;

update public.rooms
set type_id = 'type-premium-double'
where has_air_conditioning
  and has_private_bathroom
  and type_id is distinct from 'type-premium-double';

create or replace function public.enforce_room_constraints()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing_room_count integer;
begin
  if new.has_air_conditioning and new.has_private_bathroom then
    new.type_id := 'type-premium-double';
  end if;

  if new.type_id = 'type-premium-double' then
    new.has_air_conditioning := true;
    new.has_private_bathroom := true;
  end if;

  if tg_op = 'UPDATE' and new.house_id = old.house_id then
    return new;
  end if;

  perform 1
  from public.boarding_houses
  where id = new.house_id
  for update;

  select count(*)
  into existing_room_count
  from public.rooms
  where house_id = new.house_id
    and id <> new.id;

  if existing_room_count >= 18 then
    raise exception 'A boarding house can have at most 18 rooms.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists rooms_enforce_constraints on public.rooms;
create trigger rooms_enforce_constraints
  before insert or update on public.rooms
  for each row execute function public.enforce_room_constraints();

notify pgrst, 'reload schema';
