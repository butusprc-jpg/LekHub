import { NextResponse } from "next/server"

export const runtime="nodejs"

export async function GET(){
 const checks={
  supabaseUrl:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
  publicKey:Boolean((process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()),
  serviceRole:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  liffId:Boolean(process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim()),
 }
 const ok=Object.values(checks).every(Boolean)
 return NextResponse.json(
  {ok,checks},
  {status:ok?200:503,headers:{"cache-control":"no-store, max-age=0"}}
 )
}
