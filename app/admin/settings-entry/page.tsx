"use client"

import { useEffect, useState } from "react"
import { ensureLineAdminSession } from "../../../lib/line-admin-client"

export default function SettingsEntryPage(){
 const [state,setState]=useState<"checking"|"denied">("checking")

 useEffect(()=>{
  let active=true
  ;(async()=>{
   try{
    const session=await ensureLineAdminSession()
    if(!active)return
    const role=String(session.role||"").toLowerCase()
    if(!["owner","admin","oa_admin","super_admin"].includes(role)){
     setState("denied")
     return
    }
    window.location.replace("/admin/settings")
   }catch{
    if(active)setState("denied")
   }
  })()
  return()=>{active=false}
 },[])

 if(state==="checking"){
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:"24px",textAlign:"center"}}>
   <div><b>กำลังตรวจสิทธิ์แอดมิน OA...</b><p>กรุณารอสักครู่</p></div>
  </main>
 }

 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:"24px",textAlign:"center"}}>
  <div>
   <h1 style={{marginBottom:"10px"}}>ไม่มีสิทธิ์เข้าตั้งค่า</h1>
   <p>เมนูนี้สำหรับ OA Owner หรือแอดมิน OA เท่านั้น</p>
   <button type="button" onClick={()=>{try{window.liff?.closeWindow?.()}catch{};setTimeout(()=>window.location.replace("/member/play"),200)}}>ปิด</button>
  </div>
 </main>
}
