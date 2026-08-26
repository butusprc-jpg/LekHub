import { NextResponse } from "next/server"
import { createServerAdminClient } from "../../../../lib/server/supabase-admin"
import { bearerToken,verifyLineMember } from "../../../../lib/server/line-member"

export const runtime="nodejs"

type SubmitBody={
 referenceCode?:unknown
 items?:unknown
 attachmentUrl?:unknown
}

export async function POST(request:Request){
 try{
  const member=await verifyLineMember(bearerToken(request))
  const body=await request.json().catch(()=>null) as SubmitBody|null
  const referenceCode=typeof body?.referenceCode==="string"?body.referenceCode.trim():""
  const items=Array.isArray(body?.items)?body?.items:[]
  const attachmentUrl=typeof body?.attachmentUrl==="string"?body.attachmentUrl:null
  if(!referenceCode||!items.length){
   return NextResponse.json({ok:false,error:"invalid_submission"},{status:400})
  }

  const {data,error}=await createServerAdminClient().rpc("submit_lekhub_submission_v2",{
   p_channel_id:member.channelId,
   p_reference_code:referenceCode,
   p_line_user_id:member.userId,
   p_member_name:member.displayName,
   p_member_avatar:member.pictureUrl,
   p_items:items,
   p_attachment_url:attachmentUrl,
  })
  if(error)throw error
  if(!data?.success){
   return NextResponse.json({ok:false,error:data?.reason||"submit_failed"},{status:400})
  }
  return NextResponse.json({ok:true,data},{headers:{"cache-control":"no-store, max-age=0"}})
 }catch(error){
  const code=error instanceof Error?error.message:"member_submit_failed"
  const status=code.startsWith("line_")||code==="missing_line_access_token"?401:
   code.includes("tenant_")?403:500
  if(status===500)console.error("LekHub member submit failed",error)
  return NextResponse.json({ok:false,error:code},{status,headers:{"cache-control":"no-store, max-age=0"}})
 }
}
