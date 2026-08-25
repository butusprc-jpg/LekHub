import { NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"

export const runtime="nodejs"

export async function GET(){
 const session=await getLineAdminSession()
 if(!session){
  return NextResponse.json({ok:false},{status:401,headers:{"cache-control":"no-store"}})
 }
 return NextResponse.json({
  ok:true,
  displayName:session.displayName,
  role:session.role,
  sessionToken:session.token,
 },{headers:{"cache-control":"no-store"}})
}
