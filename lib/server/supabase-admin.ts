import { createClient } from "@supabase/supabase-js"

export function createServerAdminClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
 if(!url||!key)throw new Error("Missing server Supabase credentials")
 return createClient(url,key,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{"x-lekhub-server":"1"}},
 })
}
