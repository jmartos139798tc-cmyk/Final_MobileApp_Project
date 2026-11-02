update public.room_types
set description = 'Double-occupancy room.'
where id in ('type-double', 'type-premium-double')
  and description <> 'Double-occupancy room.';
