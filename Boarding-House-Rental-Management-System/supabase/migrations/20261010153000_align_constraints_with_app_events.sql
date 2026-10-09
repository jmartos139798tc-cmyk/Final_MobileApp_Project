-- Align database constraints with values and uniqueness rules used by the app.

alter table public.payments
  drop constraint if exists payments_payment_method_check;
alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method = 'cash');

alter table public.payment_proofs
  drop constraint if exists payment_proofs_payment_method_check;
alter table public.payment_proofs
  add constraint payment_proofs_payment_method_check
  check (payment_method = 'cash');

alter table public.tenant_notifications
  drop constraint if exists tenant_notifications_type_check;
alter table public.tenant_notifications
  add constraint tenant_notifications_type_check
  check (type in (
    'approval',
    'rejection',
    'invoice_created',
    'payment_recorded',
    'payment_proof_submitted',
    'payment_verified',
    'payment_rejected'
  ));

-- Protect invariants that are currently checked only in UI code.
create unique index if not exists leases_one_active_per_tenant_uidx
  on public.leases (tenant_id)
  where status = 'active';
create unique index if not exists leases_one_active_per_room_uidx
  on public.leases (room_id)
  where status = 'active';
create unique index if not exists invoices_one_type_per_period_uidx
  on public.invoices (lease_id, billing_period, invoice_type);
create unique index if not exists utility_readings_one_per_room_period_uidx
  on public.utility_readings (room_id, billing_period);
create unique index if not exists assignment_one_pending_per_tenant_uidx
  on public.room_assignment_requests (tenant_id)
  where status = 'pending';
create unique index if not exists room_changes_one_pending_per_tenant_uidx
  on public.room_change_requests (tenant_id)
  where status = 'pending';
create unique index if not exists extensions_one_pending_per_invoice_uidx
  on public.due_date_extension_requests (tenant_id, invoice_id)
  where status = 'pending';
