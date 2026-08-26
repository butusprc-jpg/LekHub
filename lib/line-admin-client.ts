"use client"

import { initLIFF } from "./liff"

export type ClientAdminSession={displayName:string;role:string}

export function clearClientAdminSession(){
 // The real admin credential is an HttpOnly cookie and cannot be read by JavaScript.
 // Logout/revocation is handled by the existing server logout route.
 fetch("/api/admin/logout",{method:"POST",credentials:"same-origin",cache:"no-store"}).catch(()=>{})
}

async function sessionFromCookie():Promise<ClientAdminSession|null>{
 try{
  const response=await fetch("/api/admin/session",{credentials:"same-origin",cache:"no-store"})
  const data=await response.json().catch(()=>({}))
  if(!response.ok||!data?.ok)return null
  return {
   displayName:String(data.displayName||"LINE Admin"),
   role:String(data.role||"admin"),
  }
 }catch{
  return null
 }
}

export async function ensureLineAdminSession():Promise<ClientAdminSession>{
 const cookieSession=await sessionFromCookie()
 if(cookieSession)return cookieSession

 const line=await initLIFF()
 if(!line)throw new Error("กำลังเปิด LINE login กรุณารอสักครู่")
 const accessToken=line.liff.getAccessToken()
 if(!accessToken)throw new Error("ไม่พบ LINE access token")

 const response=await fetch("/api/admin/line-login",{
  method:"POST",
  headers:{"content-type":"application/json"},
  credentials:"same-origin",
  cache:"no-store",
  body:JSON.stringify({accessToken}),
 })
 const result=await response.json().catch(()=>({}))
 if(!response.ok||!result.ok){
  if(result.error==="line_user_not_admin")throw new Error("LINE นี้ไม่มีสิทธิ์เข้าหลังบ้าน")
  throw new Error(result.error||"เข้าสู่หลังบ้านไม่สำเร็จ")
 }

 const verified=await sessionFromCookie()
 if(!verified)throw new Error("สร้าง session แล้วแต่ตรวจสอบสิทธิ์ซ้ำไม่ผ่าน")
 return verified
}

export async function adminRpc(
 _session:ClientAdminSession,
 name:string,
 args:Record<string,unknown>={}
):Promise<{data:any;error:{message:string}|null}>{
 try{
  const response=await fetch("/api/admin/rpc",{
   method:"POST",
   headers:{"content-type":"application/json"},
   credentials:"same-origin",
   cache:"no-store",
   body:JSON.stringify({name,args}),
  })
  const result=await response.json().catch(()=>({}))
  if(!response.ok||!result?.ok){
   return {data:null,error:{message:String(result?.error||"admin_rpc_failed")}}
  }
  return {data:result.data??null,error:null}
 }catch(error){
  return {data:null,error:{message:error instanceof Error?error.message:"admin_rpc_failed"}}
 }
}
