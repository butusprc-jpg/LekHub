import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { neonRpc } from "../../../../lib/server/neon-db"
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
  const tenantResult=await neonRpc<string>("lekhub_tenant_from_channel",{
   p_channel_id:member.channelId,p_require_ready:true,
  })
  if(tenantResult.error)throw new Error(tenantResult.error.message)
  const tenantKey=String(tenantResult.data||"").trim()
  if(!tenantKey)throw new Error("tenant_channel_not_found")

  const form=await request.formData()
  const value=form.get("file")
  if(!(value instanceof File))return NextResponse.json({ok:false,error:"missing_file"},{status:400})
  if(value.size<=0||value.size>MAX_FILE_SIZE)return NextResponse.json({ok:false,error:"file_too_large"},{status:413})
  const ext=ALLOWED.get(value.type)
  if(!ext)return NextResponse.json({ok:false,error:"unsupported_file_type"},{status:415})
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error("blob_not_configured")

  const path=`lekhub/${tenantKey}/${member.userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const blob=await put(path,value,{access:"public",contentType:value.type,addRandomSuffix:false})
  return NextResponse.json({ok:true,url:blob.url},{headers:{"cache-control":"no-store, max-age=0"}})
 }catch(error){
  const code=error instanceof Error?error.message:"member_upload_failed"
  const status=code.startsWith("line_")||code==="missing_line_access_token"?401:
   code.includes("tenant_")?403:500
  return NextResponse.json({ok:false,error:code},{status,headers:{"cache-control":"no-store, max-age=0"}})
 }
}
