-- Fix Supabase pgcrypto schema usage.
-- In this project pgcrypto is installed under schema "extensions", not "public".

create or replace function public.lekhub_line_admin_login(
  p_line_user_id text,
  p_display_name text,
  p_picture_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_role text;
  v_active boolean;
  v_token text;
  v_active_count integer;
begin
  if nullif(trim(p_line_user_id), '') is null or nullif(trim(p_display_name), '') is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_line_profile');
  end if;

  select role, is_active into v_role, v_active
  from public.lekhub_line_admins
  where line_user_id = p_line_user_id;

  if not found then
    select count(*) into v_active_count
    from public.lekhub_line_admins
    where is_active = true;

    if v_active_count = 0 then
      insert into public.lekhub_line_admins(line_user_id, display_name, picture_url, role, is_active)
      values (p_line_user_id, p_display_name, p_picture_url, 'owner', true)
      on conflict (line_user_id) do update
        set display_name = excluded.display_name,
            picture_url = excluded.picture_url,
            is_active = true;
    else
      insert into public.lekhub_line_admin_requests(line_user_id, display_name, picture_url, requested_at)
      values (p_line_user_id, p_display_name, p_picture_url, now())
      on conflict do nothing;
      return jsonb_build_object('ok', false, 'error', 'line_user_not_admin');
    end if;

    select role, is_active into v_role, v_active
    from public.lekhub_line_admins
    where line_user_id = p_line_user_id;
  else
    update public.lekhub_line_admins
    set display_name = p_display_name,
        picture_url = coalesce(p_picture_url, picture_url)
    where line_user_id = p_line_user_id;
  end if;

  if coalesce(v_active, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'line_user_not_admin');
  end if;

  delete from public.lekhub_line_admin_sessions where expires_at <= now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.lekhub_line_admin_sessions(token_hash, line_user_id, expires_at)
  values (
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    p_line_user_id,
    now() + interval '12 hours'
  );

  return jsonb_build_object(
    'ok', true,
    'session_token', v_token,
    'display_name', p_display_name,
    'role', v_role
  );
end;
$$;

create or replace function public.lekhub_check_line_admin_session(p_token text)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_row record;
begin
  if nullif(trim(p_token), '') is null then
    return jsonb_build_object('ok', false);
  end if;

  select a.line_user_id, a.display_name, a.role
  into v_row
  from public.lekhub_line_admin_sessions s
  join public.lekhub_line_admins a on a.line_user_id = s.line_user_id
  where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and s.expires_at > now()
    and a.is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_row.line_user_id,
    'display_name', v_row.display_name,
    'role', v_row.role
  );
end;
$$;
