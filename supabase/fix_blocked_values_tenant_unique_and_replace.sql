-- Applied to production Supabase on 2026-08-26.
-- Make blocked-number uniqueness tenant-aware and make replace idempotent.

drop index if exists public.lekhub_blocked_values_unique_idx;
drop index if exists public.lekhub_blocked_values_unique_rule_idx;

create unique index if not exists lekhub_blocked_values_tenant_unique_idx
on public.lekhub_blocked_values (
  tenant_key,
  item_value,
  coalesce(category,'')
);

create or replace function public.lekhub_line_admin_replace_blocked_values(
  p_token text,
  p_values text[]
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_session jsonb;
  v_tenant text;
  v text;
  v_clean text;
begin
  v_session:=public.lekhub_check_line_admin_session(p_token);
  if coalesce((v_session->>'ok')::boolean,false) is not true then
    raise exception 'admin_required';
  end if;

  v_tenant:=nullif(v_session->>'tenant_key','');
  if v_tenant is null then raise exception 'tenant_required'; end if;

  update public.lekhub_blocked_values
     set active=false, updated_at=now()
   where tenant_key=v_tenant
     and active=true;

  foreach v in array coalesce(p_values,array[]::text[]) loop
    v_clean:=regexp_replace(coalesce(v,''),'[^0-9]','','g');
    if v_clean<>'' then
      insert into public.lekhub_blocked_values(
        item_value,category,active,note,updated_at,tenant_key
      )
      values(
        v_clean,'',true,'ตั้งค่าจากหลังบ้าน',now(),v_tenant
      )
      on conflict do nothing;

      update public.lekhub_blocked_values
         set active=true,
             note='ตั้งค่าจากหลังบ้าน',
             updated_at=now()
       where tenant_key=v_tenant
         and item_value=v_clean
         and coalesce(category,'')='';
    end if;
  end loop;

  return jsonb_build_object('success',true);
end;
$function$;
