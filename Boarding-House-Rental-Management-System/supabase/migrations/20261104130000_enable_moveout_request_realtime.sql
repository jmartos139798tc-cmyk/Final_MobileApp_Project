do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'tenant_move_out_requests'
    ) then
    alter publication supabase_realtime add table public.tenant_move_out_requests;
  end if;
end;
$$;
