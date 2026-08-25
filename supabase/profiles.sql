-- LekHub uses the existing public.admin_profiles table in Supabase.
-- Do not create a second profiles table: authorization must have one source.

alter table public.admin_profiles enable row level security;

drop policy if exists "admins_can_read_own_profile" on public.admin_profiles;

create policy "admins_can_read_own_profile"
on public.admin_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);
