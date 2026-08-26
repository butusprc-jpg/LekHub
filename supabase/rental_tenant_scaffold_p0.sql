-- LekHub Rental Tenant Scaffold P0
-- Backwards-compatible preparation for multi-OA rental.
-- Existing production rows remain under tenant_key='default'.
-- This migration DOES NOT change existing business RPC logic yet.

begin;

create table if not exists public.lekhub_tenants(
 tenant_key text primary key,
 display_name text not null,
 status text not null default 'active' check(status in ('active','locked','expired')),
 line_channel_id text unique,
 expires_at timestamptz,
 locked_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

insert into public.lekhub_tenants(tenant_key,display_name,status,line_channel_id)
values('default','LekHub Main OA','active','2011199813')
on conflict (tenant_key) do update
set display_name=excluded.display_name,
    line_channel_id=coalesce(public.lekhub_tenants.line_channel_id,excluded.line_channel_id),
    updated_at=now();

do $$
declare
 r record;
begin
 for r in
  select tablename
  from pg_tables
  where schemaname='public'
    and tablename in(
     'lekhub_settings',
     'lekhub_blocked_values',
     'lekhub_submissions',
     'lekhub_submission_items',
     'lekhub_backoffice_reports',
     'lekhub_backoffice_report_items',
     'lekhub_activity_rewards',
     'lekhub_member_notes',
     'lekhub_line_admins',
     'lekhub_line_admin_sessions',
     'lekhub_line_admin_requests'
    )
 loop
  execute format(
   'alter table public.%I add column if not exists tenant_key text not null default %L',
   r.tablename,'default'
  );
 end loop;
end $$;

-- Add foreign keys only where safe to do so; use NOT VALID so existing production
-- data is not blocked by migration-time validation.
do $$
declare
 r record;
 c_name text;
begin
 for r in
  select tablename
  from pg_tables
  where schemaname='public'
    and tablename in(
     'lekhub_settings',
     'lekhub_blocked_values',
     'lekhub_submissions',
     'lekhub_submission_items',
     'lekhub_backoffice_reports',
     'lekhub_backoffice_report_items',
     'lekhub_activity_rewards',
     'lekhub_member_notes',
     'lekhub_line_admins',
     'lekhub_line_admin_sessions',
     'lekhub_line_admin_requests'
    )
 loop
  c_name=r.tablename||'_tenant_key_fkey';
  if not exists(
   select 1 from pg_constraint
   where conname=c_name
     and conrelid=format('public.%I',r.tablename)::regclass
  ) then
   execute format(
    'alter table public.%I add constraint %I foreign key(tenant_key) references public.lekhub_tenants(tenant_key) on update cascade on delete restrict not valid',
    r.tablename,c_name
   );
  end if;
 end loop;
end $$;

-- Tenant-first indexes for the high-volume tables.
create index if not exists lekhub_submissions_tenant_created_idx
 on public.lekhub_submissions(tenant_key,created_at desc);
create index if not exists lekhub_backoffice_reports_tenant_imported_idx
 on public.lekhub_backoffice_reports(tenant_key,imported_at desc);
create index if not exists lekhub_activity_rewards_tenant_idx
 on public.lekhub_activity_rewards(tenant_key);
create index if not exists lekhub_member_notes_tenant_idx
 on public.lekhub_member_notes(tenant_key);

commit;
