import { cookies } from "next/headers"
import { neonRpc } from "./server/neon-db"

export const ADMIN_COOKIE="lekhub_line_admin"

export type LineAdminSession={
 userId:string
 displayName:string
 role:string
 token:string
 tenantKey:string
}

export async function getLineAdminSession():Promise<LineAdminSession|null>{
 try{
  const store=await cookies()
  const token=store.get(ADMIN_COOKIE)?.value
  if(!token)return null
  const {data,error}=await neonRpc<any>("lekhub_check_line_admin_session",{p_token:token})
  if(error||!data?.ok)return null
  return {
   userId:String(data.user_id),
   displayName:String(data.display_name),
   role:String(data.role||"admin"),
   token,
   tenantKey:String(data.tenant_key||""),
  }
 }catch{return null}
}

export async function revokeLineAdminSession(token?:string|null){
 if(!token)return
 try{await neonRpc("lekhub_logout_line_admin_session",{p_token:token})}catch{}
}
