-- Applied to production Supabase on 2026-08-26.
-- Fix member status/submit failure caused by removed round_cutoff_time column.

create or replace function public.lekhub_effective_round_date_for_tenant(
  p_tenant text,
  p_at timestamptz default now()
)
returns date
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_override date;
  v_tz text := 'Asia/Bangkok';
  v_cut time := '16:30';
  v_local timestamp;
  v_day date;
  v_time time;
begin
  select round_date_override,
         coalesce(timezone,'Asia/Bangkok'),
         coalesce(round_rollover_time,'16:30'::time)
    into v_override,v_tz,v_cut
    from public.lekhub_settings
   where tenant_key=p_tenant and id=true;

  if v_override is not null then return v_override; end if;

  v_local:=p_at at time zone v_tz;
  v_day:=v_local::date;
  v_time:=v_local::time;

  if extract(day from v_day)::int=1 then
    if v_time<v_cut then return v_day; else return v_day+15; end if;
  elsif extract(day from v_day)::int between 2 and 15 then
    return date_trunc('month',v_day)::date+15;
  elsif extract(day from v_day)::int=16 then
    if v_time<v_cut then return v_day;
    else return (date_trunc('month',v_day)+interval '1 month')::date;
    end if;
  else
    return (date_trunc('month',v_day)+interval '1 month')::date;
  end if;
end;
$function$;
