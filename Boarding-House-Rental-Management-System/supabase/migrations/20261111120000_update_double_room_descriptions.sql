update public.room_types
set description = case id
  when 'type-double' then 'Double-occupancy room. No air-con and own cr'
  when 'type-premium-double' then 'Double-occupancy room. With air-con and own cr'
  else description
end
where id in ('type-double', 'type-premium-double');
