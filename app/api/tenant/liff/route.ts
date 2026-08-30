import { NextRequest,NextResponse } from "next/server"
import { neonRpc } from "../../../../lib/server/neon-db"

export const runtime="nodejs"

export async function GET(request:NextRequest){
 try{
  const tenant=String(request.nextUrl.searchParams.get("tenant")||"").trim().toLowerCase()
  if(!tenant)return NextResponse.json({ok:false,error:"tenant_required"},{status:400})
  const {data,error}=await neonRpc<any>("lekhub_public_tenant_liff",{p_tenant_key:tenant})
  if(error)throw new Error(error.message)
  if(!data?.ok)return NextResponse.json({ok:false,error:data?.error||"tenant_not_ready"},{status:403})
  return NextResponse.json({ok:true,tenantKey:data.tenant_key,liffId:data.liff_id},{headers:{"cache-control":"public, max-age=60"}})
 }catch(error){
  const code=error instanceof Error?error.message:"tenant_liff_failed"
  return NextResponse.json({ok:false,error:code},{status:500,headers:{"cache-control":"no-store"}})
 }
}
