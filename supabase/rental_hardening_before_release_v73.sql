-- LekHub rental hardening v73
-- Apply to production before enabling tenant rental.

begin;

create table if not exists public.lekhub_tenant_secrets(
 tenant_key text primary key references public.lekhub_tenants(tenant_key) on update cascade on delete cascade,
 line_channel_access_token text,
 updated_at timestamptz not null default now()
);

alter table public.lekhub_tenant_secrets enable row level security;
revoke all on table public.lekhub_tenant_secrets from anon, authenticated, public;

-- Public clients must never read/write tenant business tables directly.
do $$
declare r record;
begin
 for r in
  select tablename from pg_tables
  where schemaname='public' and (
   tablename like 'lekhub_%'
  )
 loop
  execute format('alter table public.%I enable row level security',r.tablename);
  execute format('revoke all on table public.%I from anon, authenticated, public',r.tablename);
 end loop;
end $$;

-- Re-grant only the SECURITY DEFINER RPC entry points used by the application.
do $$
declare r record;
begin
 for r in
  select p.oid::regprocedure as signature
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in (
      'get_lekhub_public_status_v2',
      'submit_lekhub_submission_v2',
      'lekhub_member_get_note_v2',
      'lekhub_member_list_submissions_v2',
      'lekhub_member_set_note_v2',
      'lekhub_check_line_admin_session',
      'lekhub_line_admin_login_v2',
      'lekhub_logout_line_admin_session',
      'lekhub_line_admin_get_settings',
      'lekhub_line_admin_import_submission',
      'lekhub_line_admin_list_backoffice_reports',
      'lekhub_line_admin_list_members',
      'lekhub_line_admin_list_oa_inbox',
      'lekhub_line_admin_replace_blocked_values',
      'lekhub_line_admin_set_activity_result',
      'lekhub_line_admin_set_submission_status',
      'lekhub_line_admin_update_category_amounts',
      'lekhub_line_admin_update_settings',
      'lekhub_public_tenant_liff',
      'lekhub_tenant_from_channel',
      'lekhub_owner_approve_admin_request',
      'lekhub_owner_create_tenant_v2',
      'lekhub_owner_list_admin_requests',
      'lekhub_owner_list_tenants',
      'lekhub_owner_update_tenant'
    )
 loop
  execute format('revoke all on function %s from public',r.signature);
  execute format('grant execute on function %s to anon, authenticated',r.signature);
 end loop;
end $$;


-- Strict tenant isolation: no business table may silently fall back to the old default tenant.
do $$
declare r record;
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
     'lekhub_submission_events',
     'lekhub_backoffice_reports',
     'lekhub_backoffice_report_items',
     'lekhub_activity_rewards',
     'lekhub_member_notes',
     'lekhub_line_admins',
     'lekhub_line_admin_sessions',
     'lekhub_line_admin_requests'
    )
 loop
  execute format('alter table public.%I alter column tenant_key drop default',r.tablename);
  execute format('alter table public.%I alter column tenant_key set not null',r.tablename);
 end loop;
end $$;

-- New rental OA columns are explicit and independent.
alter table public.lekhub_tenants add column if not exists line_liff_id text;
alter table public.lekhub_tenants add column if not exists isolation_ready boolean not null default false;

-- A LINE channel and LIFF id cannot belong to two tenants at the same time.
create unique index if not exists lekhub_tenants_line_channel_unique_idx
 on public.lekhub_tenants(line_channel_id)
 where line_channel_id is not null and trim(line_channel_id)<>'';

create unique index if not exists lekhub_tenants_liff_unique_idx
 on public.lekhub_tenants(line_liff_id)
 where line_liff_id is not null and trim(line_liff_id)<>'';

-- Fresh tenant creation. This function never copies settings, members, reports,
-- blocked values, rewards, or any other data from an existing tenant.
create or replace function public.lekhub_owner_create_tenant_v3(
 p_token text,
 p_tenant_key text,
 p_display_name text,
 p_line_channel_id text default null,
 p_line_liff_id text default null,
 p_line_channel_access_token text default null,
 p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
 v_session jsonb;
 v_tenant text;
 v_role text;
begin
 v_session:=public.lekhub_check_line_admin_session(p_token);
 if coalesce((v_session->>'ok')::boolean,false) is not true then
  raise exception 'admin_required';
 end if;

 v_role:=coalesce(v_session->>'role','');
 if v_role not in ('owner','super_admin') then
  raise exception 'owner_required';
 end if;

 v_tenant:=lower(trim(coalesce(p_tenant_key,'')));
 if v_tenant='' or v_tenant !~ '^[a-z0-9][a-z0-9-]{0,47}$' then
  raise exception 'invalid_tenant_key';
 end if;
 if trim(coalesce(p_display_name,''))='' then
  raise exception 'display_name_required';
 end if;

 if exists(select 1 from public.lekhub_tenants where tenant_key=v_tenant) then
  raise exception 'tenant_already_exists';
 end if;

 insert into public.lekhub_tenants(
  tenant_key,display_name,status,line_channel_id,line_liff_id,
  isolation_ready,expires_at,created_at,updated_at
 )
 values(
  v_tenant,left(trim(p_display_name),120),'active',
  nullif(trim(p_line_channel_id),''),
  nullif(trim(p_line_liff_id),''),
  false,p_expires_at,now(),now()
 );

 -- Clean defaults only. No SELECT/COPY from an existing tenant.
 insert into public.lekhub_settings(
  id,tenant_key,accepting,close_time,timezone,category_amounts,
  cash_percent,blocked_enabled,round_rollover_time,history_retention_days,updated_at
 )
 values(
  true,v_tenant,true,'23:59'::time,'Asia/Bangkok','{}'::jsonb,
  0,true,'16:30'::time,15,now()
 );

 if trim(coalesce(p_line_channel_access_token,''))<>'' then
  insert into public.lekhub_tenant_secrets(
   tenant_key,line_channel_access_token,updated_at
  )
  values(v_tenant,trim(p_line_channel_access_token),now());
 end if;

 return jsonb_build_object(
  'ok',true,
  'row',jsonb_build_object(
   'tenant_key',v_tenant,
   'display_name',left(trim(p_display_name),120),
   'status','active',
   'line_channel_id',nullif(trim(p_line_channel_id),''),
   'line_liff_id',nullif(trim(p_line_liff_id),''),
   'isolation_ready',false,
   'expires_at',p_expires_at
  )
 );
end;
$function$;

revoke all on function public.lekhub_owner_create_tenant_v3(text,text,text,text,text,text,timestamptz) from public;
grant execute on function public.lekhub_owner_create_tenant_v3(text,text,text,text,text,text,timestamptz) to anon,authenticated;

-- Parent/child tenant guards prevent accidental cross-OA references even if an RPC has a bug.
create or replace function public.lekhub_guard_submission_item_tenant()
returns trigger language plpgsql set search_path='public' as $function$
declare v_parent text;
begin
 if new.tenant_key is null or trim(new.tenant_key)='' then raise exception 'tenant_required'; end if;
 select tenant_key into v_parent from public.lekhub_submissions where id=new.submission_id;
 if v_parent is null then raise exception 'submission_not_found'; end if;
 if v_parent<>new.tenant_key then raise exception 'cross_tenant_submission_item'; end if;
 return new;
end;$function$;

drop trigger if exists lekhub_guard_submission_item_tenant_trg on public.lekhub_submission_items;
create trigger lekhub_guard_submission_item_tenant_trg
before insert or update on public.lekhub_submission_items
for each row execute function public.lekhub_guard_submission_item_tenant();

create or replace function public.lekhub_guard_submission_event_tenant()
returns trigger language plpgsql set search_path='public' as $function$
declare v_parent text;
begin
 if new.tenant_key is null or trim(new.tenant_key)='' then raise exception 'tenant_required'; end if;
 select tenant_key into v_parent from public.lekhub_submissions where id=new.submission_id;
 if v_parent is null then raise exception 'submission_not_found'; end if;
 if v_parent<>new.tenant_key then raise exception 'cross_tenant_submission_event'; end if;
 return new;
end;$function$;

drop trigger if exists lekhub_guard_submission_event_tenant_trg on public.lekhub_submission_events;
create trigger lekhub_guard_submission_event_tenant_trg
before insert or update on public.lekhub_submission_events
for each row execute function public.lekhub_guard_submission_event_tenant();

create or replace function public.lekhub_guard_backoffice_item_tenant()
returns trigger language plpgsql set search_path='public' as $function$
declare v_parent text;
begin
 if new.tenant_key is null or trim(new.tenant_key)='' then raise exception 'tenant_required'; end if;
 select tenant_key into v_parent from public.lekhub_backoffice_reports where id=new.report_id;
 if v_parent is null then raise exception 'backoffice_report_not_found'; end if;
 if v_parent<>new.tenant_key then raise exception 'cross_tenant_backoffice_item'; end if;
 return new;
end;$function$;

drop trigger if exists lekhub_guard_backoffice_item_tenant_trg on public.lekhub_backoffice_report_items;
create trigger lekhub_guard_backoffice_item_tenant_trg
before insert or update on public.lekhub_backoffice_report_items
for each row execute function public.lekhub_guard_backoffice_item_tenant();

-- Every admin-scoped SQL function in this package must reject an empty tenant.
-- The two high-risk functions are replaced with strict tenant equality in their own migrations.

commit;
