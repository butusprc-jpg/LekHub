import { NextRequest,NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime="nodejs"

function supabase(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
 const key=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()
 if(!url||!key)throw new Error("Missing Supabase environment variables")
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
}

export async function GET(request:NextRequest){
 try{
  const tenant=String(request.nextUrl.searchParams.get("tenant")||"").trim().toLowerCase()
  if(!tenant)return NextResponse.json({ok:false,error:"tenant_required"},{status:400})
  const {data,error}=await supabase().rpc("lekhub_public_tenant_liff",{p_tenant_key:tenant})
  if(error)throw error
  if(!data?.ok)return NextResponse.json({ok:false,error:data?.error||"tenant_not_ready"},{status:403})
  return NextResponse.json({ok:true,tenantKey:data.tenant_key,liffId:data.liff_id},{headers:{"cache-control":"public, max-age=60"}})
 }catch(error){
  const code=error instanceof Error?error.message:"tenant_liff_failed"
  return NextResponse.json({ok:false,error:code},{status:500,headers:{"cache-control":"no-store"}})
 }
}
