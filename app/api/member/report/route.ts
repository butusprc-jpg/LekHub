import { NextResponse } from "next/server"
import { createServerAdminClient } from "../../../../lib/server/supabase-admin"
import { bearerToken,verifyLineMember } from "../../../../lib/server/line-member"

export const runtime="nodejs"

export async function GET(request:Request){
 try{
  const member=await verifyLineMember(bearerToken(request))
  const supabase=createServerAdminClient()

  const noteResult=await supabase.rpc("lekhub_member_get_note_v2",{
   p_channel_id:member.channelId,
   p_line_user_id:member.userId,
  })
  if(noteResult.error)throw noteResult.error

  const rowsResult=await supabase.rpc("lekhub_member_list_submissions_v2",{
   p_channel_id:member.channelId,
   p_line_user_id:member.userId,
   p_limit:300,
  })
  if(rowsResult.error)throw rowsResult.error

  return NextResponse.json(
   {
    ok:true,
    note:String(noteResult.data?.note||""),
    rows:Array.isArray(rowsResult.data)?rowsResult.data:[],
   },
   {headers:{"cache-control":"no-store, max-age=0"}}
  )
 }catch(error){
  const code=error instanceof Error?error.message:"member_report_failed"
  const status=code.startsWith("line_")||code==="missing_line_access_token"?401:
   code.includes("tenant_")?403:500
  if(status===500)console.error("LekHub member report failed",error)
  return NextResponse.json({ok:false,error:code},{status,headers:{"cache-control":"no-store, max-age=0"}})
 }
}
