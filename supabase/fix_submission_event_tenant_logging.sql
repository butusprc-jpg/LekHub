-- Applied to production Supabase on 2026-08-26.
-- Fix member submit rollback caused by lekhub_submission_events.tenant_key NOT NULL.

create or replace function public.log_lekhub_submission_created()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.lekhub_submission_events(
    tenant_key,submission_id,event_type,new_status,note
  )
  values(new.tenant_key,new.id,'created',new.status,'member_submission');
  return new;
end;
$function$;

create or replace function public.cancel_own_lekhub_submission(
  p_submission_id uuid,
  p_line_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_old text;
  v_ref text;
  v_tenant text;
begin
  select status,reference_code,tenant_key
    into v_old,v_ref,v_tenant
    from public.lekhub_submissions
   where id=p_submission_id and line_user_id=p_line_user_id
   for update;

  if not found then return jsonb_build_object('success',false,'reason','not_found'); end if;
  if v_old<>'pending' then return jsonb_build_object('success',false,'reason','not_pending'); end if;

  update public.lekhub_submissions
     set status='cancelled',reviewed_at=null,reviewed_by=null,
         admin_note=coalesce(admin_note,'')
   where id=p_submission_id and tenant_key=v_tenant;

  insert into public.lekhub_submission_events(
    tenant_key,submission_id,event_type,old_status,new_status,note
  )
  values(v_tenant,p_submission_id,'member_cancelled',v_old,'cancelled','cancelled by member');

  return jsonb_build_object('success',true,'id',p_submission_id,'reference_code',v_ref,'status','cancelled');
end;
$function$;
