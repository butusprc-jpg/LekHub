# LekHub
LINE OA + LIFF Web App with Supabase SSR authentication.

Required Vercel environment variables (Production, Preview, and Development):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Protected routes are under `/admin`. Admin access is authorized by the
`public.admin_profiles` table with `is_active = true`.

The login page supports both password login and an email magic link. Add the
deployed `/auth/callback` URL to Supabase Authentication > URL Configuration >
Redirect URLs.
