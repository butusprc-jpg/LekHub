import { del,list } from "@vercel/blob"
import { NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"

export const runtime="nodejs"

export async function POST(){
 try{
  const session=await getLineAdminSession()
  if(!session)return NextResponse.json({ok:false,error:"admin_required"},{status:401})
  if(!session.tenantKey)return NextResponse.json({ok:false,error:"tenant_required"},{status:403})
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error("blob_not_configured")

  const cutoff=Date.now()-15*24*60*60*1000
  let cursor:string|undefined
  let deleted=0
  do{
   const page=await list({prefix:`lekhub/${session.tenantKey}/`,cursor,limit:1000})
   const expired=page.blobs.filter(blob=>new Date(blob.uploadedAt).getTime()<cutoff)
   if(expired.length){
    await del(expired.map(blob=>blob.url))
    deleted+=expired.length
   }
   cursor=page.hasMore?page.cursor:undefined
  }while(cursor)

  return NextResponse.json({ok:true,deleted},{headers:{"cache-control":"no-store"}})
 }catch(error){
  console.error("LekHub Blob cleanup failed",error)
  return NextResponse.json({ok:false,error:"cleanup_failed"},{status:500})
 }
}
