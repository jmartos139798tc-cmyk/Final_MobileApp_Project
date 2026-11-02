update public.room_types
set name = 'Double Room'
where id in ('type-double', 'type-premium-double')
  and name <> 'Double Room';

notify pgrst, 'reload schema';
