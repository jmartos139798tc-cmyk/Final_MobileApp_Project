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
    'payment_rejected',
    'complaint_status'
  ));

create or replace function public.notify_tenant_complaint_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  status_label text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  status_label := case new.status
    when 'in-progress' then 'In Progress'
    when 'resolved' then 'Resolved'
    else 'Pending'
  end;

  insert into public.tenant_notifications (id, tenant_id, type, title, message)
  values (
    'notif-complaint-' || replace(gen_random_uuid()::text, '-', ''),
    new.tenant_id,
    'complaint_status',
    'Complaint status updated',
    format('Your complaint "%s" is now %s.', new.title, status_label)
  );

  return new;
end;
$$;

drop trigger if exists complaints_notify_tenant_status on public.complaints;
create trigger complaints_notify_tenant_status
  after update of status on public.complaints
  for each row
  execute function public.notify_tenant_complaint_status();

insert into public.tenant_notifications (id, tenant_id, type, title, message)
select
  'notif-complaint-' || replace(gen_random_uuid()::text, '-', ''),
  complaint.tenant_id,
  'complaint_status',
  'Complaint status updated',
  format(
    'Your complaint "%s" is now %s.',
    complaint.title,
    case complaint.status
      when 'in-progress' then 'In Progress'
      when 'resolved' then 'Resolved'
      else 'Pending'
    end
  )
from public.complaints as complaint
where complaint.status <> 'pending'
  and not exists (
    select 1
    from public.tenant_notifications as notification
    where notification.tenant_id = complaint.tenant_id
      and notification.type = 'complaint_status'
      and notification.title = 'Complaint status updated'
      and notification.message = format(
        'Your complaint "%s" is now %s.',
        complaint.title,
        case complaint.status
          when 'in-progress' then 'In Progress'
          when 'resolved' then 'Resolved'
          else 'Pending'
        end
      )
  );
