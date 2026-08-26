-- LekHub Rental Hardening P0
-- Goal: member identity and writes are server-verified; browser can no longer call
-- member data RPCs or write directly to lekhub-uploads.
-- Safe for the current single-OA production flow when the v62 server APIs and
-- SUPABASE_SERVICE_ROLE_KEY are configured first.

begin;

-- Block direct table access to sensitive data. Security-definer RPCs and
-- service_role server routes remain the supported access paths.
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname='public'
      and tablename in (
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
    execute format('revoke all on table public.%I from anon, authenticated',r.tablename);
  end loop;
end $$;

-- Member data RPCs are now server-only. This loop handles every existing overload.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in (
        'submit_lekhub_submission',
        'lekhub_member_list_submissions',
        'lekhub_member_get_note',
        'lekhub_member_set_note'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated',r.signature);
    execute format('grant execute on function %s to service_role',r.signature);
  end loop;
end $$;

-- Keep public status read-only RPC available to the member screen.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='get_lekhub_public_status'
  loop
    execute format('grant execute on function %s to anon, authenticated, service_role',r.signature);
  end loop;
end $$;

-- Remove browser write policies that explicitly target the LekHub upload bucket.
-- Policies for unrelated buckets are untouched.
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and cmd in ('INSERT','UPDATE','DELETE','ALL')
      and (
        coalesce(qual,'') ilike '%lekhub-uploads%'
        or coalesce(with_check,'') ilike '%lekhub-uploads%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects',r.policyname);
  end loop;
end $$;

-- Enforce upload limits at bucket level. Public READ is kept for compatibility
-- with existing report/image URLs; writes are server-side only after this migration.
update storage.buckets
set file_size_limit=5242880,
    allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id='lekhub-uploads';

commit;
