-- Let tenants permanently remove only their own resolved complaints.
create policy complaints_tenant_delete_resolved
  on public.complaints
  for delete
  to authenticated
  using (
    (select private.owns_tenant(tenant_id))
    and status = 'resolved'
  );
