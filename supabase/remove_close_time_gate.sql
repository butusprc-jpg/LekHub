-- Production behavior: no close-time gate.
-- The legacy close_time column remains only because the existing schema is NOT NULL.
-- It is intentionally ignored by submission/public-status logic.

create or replace function public.get_lekhub_public_status()
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_accepting boolean;
  v_tz text;
begin
  select accepting,timezone into v_accepting,v_tz
  from public.lekhub_settings
  where id=true;

  return jsonb_build_object(
    'success',true,
    'accepting',coalesce(v_accepting,true),
    'close_time',null,
    'timezone',coalesce(v_tz,'Asia/Bangkok'),
    'is_open',coalesce(v_accepting,true)
  );
end;
$$;
