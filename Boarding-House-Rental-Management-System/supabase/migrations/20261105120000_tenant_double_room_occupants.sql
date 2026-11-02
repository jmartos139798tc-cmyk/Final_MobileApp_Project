create or replace function public.get_double_room_occupancy()
returns table (
  room_id text,
  occupant_count bigint,
  occupant_names text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id as room_id,
    count(l.id) as occupant_count,
    coalesce(
      array_agg(nullif(btrim(concat_ws(' ', t.first_name, t.last_name)), '') order by t.first_name, t.last_name)
        filter (where l.id is not null and nullif(btrim(concat_ws(' ', t.first_name, t.last_name)), '') is not null),
      array[]::text[]
    ) as occupant_names
  from public.rooms r
  join public.room_types rt on rt.id = r.type_id and rt.max_capacity > 1
  left join public.leases l on l.room_id = r.id and l.status = 'active'
  left join public.tenants t on t.id = l.tenant_id
  where (select auth.uid()) is not null
  group by r.id
$$;

revoke all on function public.get_double_room_occupancy() from public, anon;
grant execute on function public.get_double_room_occupancy() to authenticated;

notify pgrst, 'reload schema';
