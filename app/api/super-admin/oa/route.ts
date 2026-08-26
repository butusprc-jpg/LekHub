import { NextRequest, NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"
import { createServerAdminClient } from "../../../../lib/server/supabase-admin"

export const runtime="nodejs"

type TenantStatus="active"|"locked"|"expired"
type SupabaseLikeError={message?:unknown;code?:unknown;details?:unknown;hint?:unknown}

async function requireOwner(){
 const session=await getLineAdminSession()
 if(!session)return {error:NextResponse.json({ok:false,error:"unauthorized"},{status:401})}
 if(session.role!=="owner"&&session.role!=="super_admin"){
  return {error:NextResponse.json({ok:false,error:"owner_required"},{status:403})}
 }
 return {session}
}

function normalizeKey(value:unknown){
 return String(value||"").trim().toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,48)
}

function projectRef(){
 try{return new URL(String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"")).hostname.split(".")[0]||"unknown"}
 catch{return "unknown"}
}

function errorInfo(error:unknown){
 if(error instanceof Error)return {message:error.message,code:"",details:"",hint:""}
 if(error&&typeof error==="object"){
  const value=error as SupabaseLikeError
  return {
   message:String(value.message||"database_error"),
   code:String(value.code||""),
   details:String(value.details||""),
   hint:String(value.hint||""),
  }
 }
 return {message:String(error||"unknown_error"),code:"",details:"",hint:""}
}

function jsonError(error:unknown,status=500){
 const info=errorInfo(error)
 console.error("LekHub tenant control API failed",JSON.stringify({projectRef:projectRef(),...info}))
 const readable=[info.message,info.code&&`(${info.code})`,info.details].filter(Boolean).join(" ")
 return NextResponse.json({ok:false,error:readable||"database_error"},{status,headers:{"cache-control":"no-store, max-age=0"}})
}

export async function GET(){
 try{
  console.info("LekHub tenant control project",projectRef())
  const auth=await requireOwner();if("error" in auth)return auth.error
  const supabase=createServerAdminClient()
  const {data,error}=await supabase.rpc("lekhub_owner_list_tenants",{p_token:auth.session.token})
  if(error)throw error
  return NextResponse.json({ok:true,rows:data?.rows||[]},{headers:{"cache-control":"no-store, max-age=0"}})
 }catch(error){return jsonError(error)}
}

export async function POST(request:NextRequest){
 try{
  const auth=await requireOwner();if("error" in auth)return auth.error
  const body=await request.json().catch(()=>({}))
  const tenantKey=normalizeKey(body.tenantKey)
  const displayName=String(body.displayName||"").trim()
  const lineChannelId=String(body.lineChannelId||"").trim()||null
  const expiresAt=body.expiresAt?new Date(String(body.expiresAt)).toISOString():null
  if(!tenantKey||!displayName)return NextResponse.json({ok:false,error:"กรอกชื่อสมาชิก/OA และรหัสผู้เช่าให้ครบ"},{status:400})
  const supabase=createServerAdminClient()
  const {data,error}=await supabase.rpc("lekhub_owner_create_tenant",{
   p_token:auth.session.token,
   p_tenant_key:tenantKey,
   p_display_name:displayName,
   p_line_channel_id:lineChannelId,
   p_expires_at:expiresAt,
  })
  if(error)throw error
  return NextResponse.json({ok:true,row:data?.row},{headers:{"cache-control":"no-store, max-age=0"}})
 }catch(error){return jsonError(error,400)}
}

export async function PATCH(request:NextRequest){
 try{
  const auth=await requireOwner();if("error" in auth)return auth.error
  const body=await request.json().catch(()=>({}))
  const tenantKey=normalizeKey(body.tenantKey)
  if(!tenantKey)return NextResponse.json({ok:false,error:"ไม่พบรหัสผู้เช่า"},{status:400})

  const patch:Record<string,unknown>={}
  if(body.displayName!==undefined)patch.displayName=String(body.displayName||"").trim()
  if(body.lineChannelId!==undefined)patch.lineChannelId=String(body.lineChannelId||"").trim()
  if(body.expiresAt!==undefined)patch.expiresAt=body.expiresAt?new Date(String(body.expiresAt)).toISOString():null
  if(body.status!==undefined){
   const status=String(body.status) as TenantStatus
   if(!["active","locked","expired"].includes(status))return NextResponse.json({ok:false,error:"สถานะไม่ถูกต้อง"},{status:400})
   patch.status=status
  }
  if(body.extendDays!==undefined)patch.extendDays=Math.max(1,Math.min(365,Number(body.extendDays)||30))

  const supabase=createServerAdminClient()
  const {data,error}=await supabase.rpc("lekhub_owner_update_tenant",{
   p_token:auth.session.token,
   p_tenant_key:tenantKey,
   p_patch:patch,
  })
  if(error)throw error
  return NextResponse.json({ok:true,row:data?.row},{headers:{"cache-control":"no-store, max-age=0"}})
 }catch(error){return jsonError(error,400)}
}
