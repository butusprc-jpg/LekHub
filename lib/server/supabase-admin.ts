import { createClient } from "@supabase/supabase-js"

export function createServerAdminClient(){
 const url=(process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL)?.trim()
 // Production currently has the publishable/anon key used by the existing
 // LekHub admin RPC gateway. Prefer a service-role/secret key when present,
 // but fall back to that configured key so the tenant control API works in
 // the same deployment instead of throwing before any database request.
 const key=(
  process.env.SUPABASE_SERVICE_ROLE_KEY??
  process.env.SUPABASE_SECRET_KEY??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 )?.trim()
 if(!url||!key)throw new Error("Missing server Supabase credentials")
 return createClient(url,key,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{"x-lekhub-server":"1"}},
 })
}
