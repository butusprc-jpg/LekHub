-- Applied to production Supabase on 2026-08-26.
-- Reward formula: (stake / 10) * category multiplier.
-- Adds winning_items details for LINE Flex notifications.
create or replace function public.lekhub_line_admin_set_activity_result(p_token text, p_prize_number text, p_3front text, p_3back text, p_2bottom text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
 v_session jsonb; v_tenant text; v_prize text; v_front text; v_back text; v_bottom text;
 v_round date; v_rates jsonb; v_count integer; v_total numeric; v_winners jsonb;
begin
 v_session:=public.lekhub_check_line_admin_session(p_token);
 if coalesce((v_session->>'ok')::boolean,false) is not true then raise exception 'admin_required'; end if;
 v_tenant:=nullif(v_session->>'tenant_key','');
 v_prize:=regexp_replace(coalesce(p_prize_number,''),'[^0-9]','','g');
 v_front:=regexp_replace(coalesce(p_3front,''),'[^0-9]','','g');
 v_back:=regexp_replace(coalesce(p_3back,''),'[^0-9]','','g');
 v_bottom:=regexp_replace(coalesce(p_2bottom,''),'[^0-9]','','g');
 if length(v_prize)<>6 then raise exception 'activity_prize_number_must_be_6_digits'; end if;
 if v_front<>'' and length(v_front)<>3 then raise exception 'activity_3front_must_be_3_digits'; end if;
 if v_back<>'' and length(v_back)<>3 then raise exception 'activity_3back_must_be_3_digits'; end if;
 if v_bottom<>'' and length(v_bottom)<>2 then raise exception 'activity_2bottom_must_be_2_digits'; end if;
 select public.lekhub_effective_round_date_for_tenant(v_tenant,now()),coalesce(category_amounts,'{}'::jsonb)
 into v_round,v_rates from public.lekhub_settings where tenant_key is not distinct from v_tenant and id=true;
 if v_round is null then v_round:=public.lekhub_effective_round_date_for_tenant(v_tenant,now()); end if;
 insert into public.lekhub_settings(id,tenant_key,accepting,close_time,timezone,activity_prize_number,activity_3front,activity_3back,activity_2bottom,updated_at)
 values(true,v_tenant,true,'16:30'::time,'Asia/Bangkok',v_prize,nullif(v_front,''),nullif(v_back,''),nullif(v_bottom,''),now())
 on conflict (tenant_key,id) do update set activity_prize_number=excluded.activity_prize_number,activity_3front=excluded.activity_3front,activity_3back=excluded.activity_3back,activity_2bottom=excluded.activity_2bottom,updated_at=now();
 delete from public.lekhub_activity_rewards where tenant_key is not distinct from v_tenant and round_date=v_round;
 insert into public.lekhub_activity_rewards(round_date,prize_number,submission_id,item_id,line_user_id,member_name,selected_value,category,category_label,stake,multiplier,reward_amount,tenant_key)
 select s.round_date,v_prize,s.id,i.id,s.line_user_id,s.member_name,i.item_value,i.category,i.category_label,i.heart,
  coalesce(nullif(v_rates->>i.category,'')::numeric,0),round((i.heart/10.0)*coalesce(nullif(v_rates->>i.category,'')::numeric,0),2),v_tenant
 from public.lekhub_submissions s join public.lekhub_submission_items i on i.submission_id=s.id and i.tenant_key is not distinct from v_tenant
 where s.tenant_key is not distinct from v_tenant and s.round_date=v_round and coalesce(nullif(v_rates->>i.category,'')::numeric,0)>0 and (
  (i.category='3top' and i.item_value=right(v_prize,3)) or
  (i.category in ('3topmix','mix') and length(i.item_value)=3 and public.lekhub_digits_key(i.item_value)=public.lekhub_digits_key(right(v_prize,3))) or
  (i.category='3front' and v_front<>'' and i.item_value=v_front) or
  (i.category='3back' and v_back<>'' and i.item_value=v_back) or
  (i.category='2top' and i.item_value=right(v_prize,2)) or
  (i.category='bottom' and v_bottom<>'' and i.item_value=v_bottom) or
  (i.category='single' and i.item_value=right(v_prize,1))
 );
 select count(*),coalesce(sum(reward_amount),0) into v_count,v_total from public.lekhub_activity_rewards where tenant_key is not distinct from v_tenant and round_date=v_round;
 select coalesce(jsonb_agg(jsonb_build_object('line_user_id',x.line_user_id,'member_name',x.member_name,'reward_total',x.reward_total,'winning_items',x.winning_items) order by x.member_name),'[]'::jsonb)
 into v_winners from (
  select r.line_user_id,max(r.member_name) member_name,sum(r.reward_amount) reward_total,
   jsonb_agg(jsonb_build_object('selected_value',r.selected_value,'category',r.category,'category_label',r.category_label,'stake',r.stake,'multiplier',r.multiplier,'reward_amount',r.reward_amount) order by r.category_label,r.selected_value) winning_items
  from public.lekhub_activity_rewards r where r.tenant_key is not distinct from v_tenant and r.round_date=v_round group by r.line_user_id
 ) x;
 return jsonb_build_object('success',true,'round_date',v_round,'prize_number',v_prize,'3front',nullif(v_front,''),'3back',nullif(v_back,''),'2bottom',nullif(v_bottom,''),'winner_items',v_count,'reward_total',v_total,'winners',v_winners);
end;
$function$;
