import { NextRequest, NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"
import { createServerAdminClient } from "../../../../lib/server/supabase-admin"

export const runtime="nodejs"

type TenantStatus="active"|"locked"|"expired"

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

export async function GET(){
 const auth=await requireOwner();if("error" in auth)return auth.error
 const supabase=createServerAdminClient()
 const {data,error}=await supabase.from("lekhub_tenants")
  .select("tenant_key,display_name,status,line_channel_id,expires_at,locked_at,created_at,updated_at")
  .order("created_at",{ascending:false})
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500})
 return NextResponse.json({ok:true,rows:data||[]},{headers:{"cache-control":"no-store"}})
}

export async function POST(request:NextRequest){
 const auth=await requireOwner();if("error" in auth)return auth.error
 const body=await request.json().catch(()=>({}))
 const tenantKey=normalizeKey(body.tenantKey)
 const displayName=String(body.displayName||"").trim()
 const lineChannelId=String(body.lineChannelId||"").trim()||null
 const expiresAt=body.expiresAt?new Date(String(body.expiresAt)).toISOString():null
 if(!tenantKey||!displayName)return NextResponse.json({ok:false,error:"missing_required_fields"},{status:400})
 const supabase=createServerAdminClient()
 const {data,error}=await supabase.from("lekhub_tenants").insert({
  tenant_key:tenantKey,display_name:displayName,status:"active",line_channel_id:lineChannelId,expires_at:expiresAt,updated_at:new Date().toISOString()
 }).select("tenant_key,display_name,status,line_channel_id,expires_at,locked_at,created_at,updated_at").single()
 if(error)return NextResponse.json({ok:false,error:error.message},{status:400})
 return NextResponse.json({ok:true,row:data})
}

export async function PATCH(request:NextRequest){
 const auth=await requireOwner();if("error" in auth)return auth.error
 const body=await request.json().catch(()=>({}))
 const tenantKey=normalizeKey(body.tenantKey)
 if(!tenantKey)return NextResponse.json({ok:false,error:"tenant_required"},{status:400})
 const patch:Record<string,unknown>={updated_at:new Date().toISOString()}
 if(body.displayName!==undefined)patch.display_name=String(body.displayName||"").trim()
 if(body.lineChannelId!==undefined)patch.line_channel_id=String(body.lineChannelId||"").trim()||null
 if(body.expiresAt!==undefined)patch.expires_at=body.expiresAt?new Date(String(body.expiresAt)).toISOString():null
 if(body.status!==undefined){
  const status=String(body.status) as TenantStatus
  if(!["active","locked","expired"].includes(status))return NextResponse.json({ok:false,error:"invalid_status"},{status:400})
  patch.status=status
  patch.locked_at=status==="locked"?new Date().toISOString():null
 }
 if(body.extendDays!==undefined){
  const days=Math.max(1,Math.min(365,Number(body.extendDays)||30))
  const supabase=createServerAdminClient()
  const {data:current,error:readError}=await supabase.from("lekhub_tenants").select("expires_at").eq("tenant_key",tenantKey).single()
  if(readError)return NextResponse.json({ok:false,error:readError.message},{status:400})
  const base=current?.expires_at&&new Date(current.expires_at).getTime()>Date.now()?new Date(current.expires_at):new Date()
  base.setDate(base.getDate()+days)
  patch.expires_at=base.toISOString();patch.status="active";patch.locked_at=null
 }
 const supabase=createServerAdminClient()
 const {data,error}=await supabase.from("lekhub_tenants").update(patch).eq("tenant_key",tenantKey)
  .select("tenant_key,display_name,status,line_channel_id,expires_at,locked_at,created_at,updated_at").single()
 if(error)return NextResponse.json({ok:false,error:error.message},{status:400})
 return NextResponse.json({ok:true,row:data})
}
