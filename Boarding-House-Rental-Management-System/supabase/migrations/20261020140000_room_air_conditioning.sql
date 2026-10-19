alter table public.rooms
  add column if not exists has_air_conditioning boolean not null default false;
