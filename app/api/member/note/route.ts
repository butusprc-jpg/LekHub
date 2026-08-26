import { NextResponse } from "next/server"
import { createServerAdminClient } from "../../../../lib/server/supabase-admin"
import { bearerToken,verifyLineMember } from "../../../../lib/server/line-member"

export const runtime="nodejs"

export async function POST(request:Request){
 try{
  const member=await verifyLineMember(bearerToken(request))
  const body=await request.json().catch(()=>null) as {note?:unknown}|null
  if(!body||typeof body.note!=="string"){
   return NextResponse.json({ok:false,error:"invalid_note"},{status:400})
  }
  const note=body.note.slice(0,5000)
  const {data,error}=await createServerAdminClient().rpc("lekhub_member_set_note",{
   p_line_user_id:member.userId,
   p_note:note,
  })
  if(error)throw error
  if(!data?.success)return NextResponse.json({ok:false,error:"note_failed"},{status:400})
  return NextResponse.json(
   {ok:true,note:String(data.note||"")},
   {headers:{"cache-control":"no-store, max-age=0"}}
  )
 }catch(error){
  const code=error instanceof Error?error.message:"member_note_failed"
  const status=code.startsWith("line_")||code==="missing_line_access_token"?401:500
  if(status===500)console.error("LekHub member note failed",error)
  return NextResponse.json({ok:false,error:code},{status,headers:{"cache-control":"no-store, max-age=0"}})
 }
}
