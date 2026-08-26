import { NextResponse } from "next/server"
import { createServerAdminClient } from "../../../../lib/server/supabase-admin"
import { bearerToken,verifyLineMember } from "../../../../lib/server/line-member"

export const runtime="nodejs"

const MAX_FILE_SIZE=5*1024*1024
const ALLOWED=new Map([
 ["image/jpeg","jpg"],
 ["image/png","png"],
 ["image/webp","webp"],
])

export async function POST(request:Request){
 try{
  const member=await verifyLineMember(bearerToken(request))
  const supabase=createServerAdminClient()
  const tenantResult=await supabase.rpc("lekhub_tenant_from_channel",{
   p_channel_id:member.channelId,
   p_require_ready:true,
  })
  if(tenantResult.error)throw tenantResult.error
  const tenantKey=String(tenantResult.data||"").trim()
  if(!tenantKey)throw new Error("tenant_channel_not_found")

  const form=await request.formData()
  const value=form.get("file")
  if(!(value instanceof File)){
   return NextResponse.json({ok:false,error:"missing_file"},{status:400})
  }
  if(value.size<=0||value.size>MAX_FILE_SIZE){
   return NextResponse.json({ok:false,error:"file_too_large"},{status:413})
  }
  const ext=ALLOWED.get(value.type)
  if(!ext){
   return NextResponse.json({ok:false,error:"unsupported_file_type"},{status:415})
  }

  const path=`${tenantKey}/${member.userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const bytes=new Uint8Array(await value.arrayBuffer())
  const {error}=await supabase.storage.from("lekhub-uploads").upload(path,bytes,{
   contentType:value.type,
   cacheControl:"3600",
   upsert:false,
  })
  if(error){
   console.error("LekHub member upload failed",error)
   return NextResponse.json({ok:false,error:"upload_failed"},{status:500})
  }
  const publicUrl=supabase.storage.from("lekhub-uploads").getPublicUrl(path).data.publicUrl
  return NextResponse.json(
   {ok:true,url:publicUrl},
   {headers:{"cache-control":"no-store, max-age=0"}}
  )
 }catch(error){
  const code=error instanceof Error?error.message:"member_upload_failed"
  const status=code.startsWith("line_")||code==="missing_line_access_token"?401:
   code.includes("tenant_")?403:500
  return NextResponse.json({ok:false,error:code},{status,headers:{"cache-control":"no-store, max-age=0"}})
 }
}
