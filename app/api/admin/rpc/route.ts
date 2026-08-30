import { NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"
import { neonRpc } from "../../../../lib/server/neon-db"

export const runtime="nodejs"

const ALLOWED_RPC=new Set([
 "lekhub_line_admin_get_settings",
 "lekhub_line_admin_import_submission",
 "lekhub_line_admin_list_backoffice_reports",
 "lekhub_line_admin_list_members",
 "lekhub_line_admin_list_oa_inbox",
 "lekhub_line_admin_replace_blocked_values",
 "lekhub_line_admin_set_activity_result",
 "lekhub_line_admin_set_submission_status",
 "lekhub_line_admin_update_category_amounts",
 "lekhub_line_admin_update_settings",
])


export async function POST(request:Request){
 try{
  const session=await getLineAdminSession()
  if(!session){
   return NextResponse.json(
    {ok:false,error:"admin_required"},
    {status:401,headers:{"cache-control":"no-store, max-age=0"}}
   )
  }

  const body=await request.json().catch(()=>null) as {name?:unknown;args?:unknown}|null
  const name=typeof body?.name==="string"?body.name:""
  if(!ALLOWED_RPC.has(name)){
   return NextResponse.json(
    {ok:false,error:"rpc_not_allowed"},
    {status:403,headers:{"cache-control":"no-store, max-age=0"}}
   )
  }

  const rawArgs=body?.args&&typeof body.args==="object"&&!Array.isArray(body.args)
   ? body.args as Record<string,unknown>
   : {}
  const {p_token:_ignoredClientToken,...args}=rawArgs

  const {data,error}=await neonRpc(name,{...args,p_token:session.token})
  if(error){
   console.error("LekHub admin RPC failed",name,error)
   return NextResponse.json(
    {ok:false,error:"admin_rpc_failed"},
    {status:500,headers:{"cache-control":"no-store, max-age=0"}}
   )
  }

  return NextResponse.json(
   {ok:true,data},
   {headers:{"cache-control":"no-store, max-age=0"}}
  )
 }catch(error){
  console.error("LekHub admin RPC gateway failed",error)
  return NextResponse.json(
   {ok:false,error:"admin_rpc_failed"},
   {status:500,headers:{"cache-control":"no-store, max-age=0"}}
  )
 }
}
