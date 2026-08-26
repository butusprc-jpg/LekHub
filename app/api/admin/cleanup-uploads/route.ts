import { NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"

export const runtime="nodejs"

export async function POST(){
 try{
  const session=await getLineAdminSession()
  if(!session){
   return NextResponse.json(
    {ok:false,error:"admin_required"},
    {status:401,headers:{"cache-control":"no-store, max-age=0"}}
   )
  }

  const response=await fetch(
   "https://uhpgnwclyzjnmnbrnglb.supabase.co/functions/v1/lekhub-cleanup-uploads",
   {
    method:"POST",
    headers:{"content-type":"application/json"},
    cache:"no-store",
    body:JSON.stringify({adminToken:session.token}),
   }
  )

  const result=await response.json().catch(()=>({}))
  return NextResponse.json(
   response.ok?{ok:true,...result}:{ok:false,error:"cleanup_failed"},
   {status:response.ok?200:502,headers:{"cache-control":"no-store, max-age=0"}}
  )
 }catch(error){
  console.error("LekHub cleanup proxy failed",error)
  return NextResponse.json(
   {ok:false,error:"cleanup_failed"},
   {status:500,headers:{"cache-control":"no-store, max-age=0"}}
  )
 }
}
