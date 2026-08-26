import { NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"

export const runtime="nodejs"

export async function GET(){
 const session=await getLineAdminSession()
 if(!session){
  return NextResponse.json(
   {ok:false},
   {status:401,headers:{"cache-control":"no-store, max-age=0"}}
  )
 }
 return NextResponse.json(
  {
   ok:true,
   displayName:session.displayName,
   role:session.role,
  },
  {headers:{"cache-control":"no-store, max-age=0"}}
 )
}
