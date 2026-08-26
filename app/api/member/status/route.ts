import { NextResponse } from "next/server"
import { createServerAdminClient } from "../../../../lib/server/supabase-admin"
import { bearerToken,verifyLineMember } from "../../../../lib/server/line-member"

export const runtime="nodejs"

export async function GET(request:Request){
 try{
  const member=await verifyLineMember(bearerToken(request))
  const {data,error}=await createServerAdminClient().rpc("get_lekhub_public_status_v2",{
   p_channel_id:member.channelId,
  })
  if(error)throw error
  return NextResponse.json({ok:true,data},{headers:{"cache-control":"no-store, max-age=0"}})
 }catch(error){
  const code=error instanceof Error?error.message:"member_status_failed"
  const status=code.startsWith("line_")||code==="missing_line_access_token"?401:
   code.includes("tenant_")?403:500
  if(status===500)console.error("LekHub member status failed",error)
  return NextResponse.json({ok:false,error:code},{status,headers:{"cache-control":"no-store, max-age=0"}})
 }
}
