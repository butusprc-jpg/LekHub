
begin;

-- Test-only platform owner/session
insert into public.lekhub_line_admins(tenant_key,line_user_id,display_name,role,is_active)
values('platform','U00000000000000000000000000000000','Test Owner','owner',true)
on conflict(tenant_key,line_user_id) do update set role='owner',is_active=true;

insert into public.lekhub_line_admin_sessions(token_hash,tenant_key,line_user_id,expires_at)
values(
 encode(digest('test-owner-token','sha256'),'hex'),
 'platform','U00000000000000000000000000000000',now()+interval '1 hour'
)
on conflict(token_hash) do update set expires_at=excluded.expires_at;

select public.lekhub_owner_create_tenant_v3(
 'test-owner-token','oa-a','OA A','channel-a','liff-a','token-a',now()+interval '30 days'
);
select public.lekhub_owner_create_tenant_v3(
 'test-owner-token','oa-b','OA B','channel-b','liff-b','token-b',now()+interval '30 days'
);

update public.lekhub_tenants set isolation_ready=true where tenant_key in ('oa-a','oa-b');

select public.submit_lekhub_submission_v2(
 'channel-a','A-001','Uaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','Member A',null,
 '[{"value":"123","category":"3top","category_label":"3 บน","heart":20}]'::jsonb,null
);
select public.submit_lekhub_submission_v2(
 'channel-b','B-001','Ubbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','Member B',null,
 '[{"value":"456","category":"3top","category_label":"3 บน","heart":30}]'::jsonb,null
);

do $$
declare v_a uuid;
begin
 select id into v_a from public.lekhub_submissions where tenant_key='oa-a' and reference_code='A-001';

 begin
  insert into public.lekhub_submission_items(
   tenant_key,submission_id,item_value,category,category_label,heart,sort_order
  ) values('oa-b',v_a,'999','3top','3 บน',10,99);
  raise exception 'cross_tenant_write_was_not_blocked';
 exception
  when foreign_key_violation then null;
 end;

 if exists(
  select 1 from public.lekhub_submissions
  where tenant_key='oa-a' and reference_code='B-001'
 ) then raise exception 'cross_tenant_read_detected'; end if;
end $$;

select
 (select count(*) from public.lekhub_submissions where tenant_key='oa-a') as oa_a_rows,
 (select count(*) from public.lekhub_submissions where tenant_key='oa-b') as oa_b_rows,
 (select line_channel_access_token from public.lekhub_tenant_secrets where tenant_key='oa-a') as token_a,
 (select line_channel_access_token from public.lekhub_tenant_secrets where tenant_key='oa-b') as token_b;

rollback;
