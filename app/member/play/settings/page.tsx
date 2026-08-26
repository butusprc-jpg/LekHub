"use client"

import { useEffect, useState } from "react"
import { initLIFF } from "../../../../lib/liff"

export default function LiffSettingsEntryPage(){
  const [message,setMessage]=useState("กำลังเปิดหน้าตั้งค่า...")

  useEffect(()=>{
    let active=true

    ;(async()=>{
      try{
        const line=await initLIFF()
        if(!active)return

        if(!line){
          setMessage("กรุณาเปิดผ่าน LINE OA")
          return
        }

        const accessToken=line.liff.getAccessToken()
        if(!accessToken){
          setMessage("ไม่พบ LINE access token สำหรับเข้าหน้าตั้งค่า")
          return
        }

        setMessage(`กำลังเข้าหน้าตั้งค่า: ${line.profile.displayName}`)

        const response=await fetch("/api/admin/line-login",{
          method:"POST",
          headers:{"content-type":"application/json"},
          credentials:"same-origin",
          cache:"no-store",
          body:JSON.stringify({accessToken}),
        })

        const result=await response.json().catch(()=>({}))
        if(!active)return

        if(!response.ok||!result.ok||!result.sessionToken){
          setMessage(
            result.error==="line_user_not_admin"
              ?"LINE นี้ไม่มีสิทธิ์เข้าหน้าตั้งค่า"
              :`เข้าหน้าตั้งค่าไม่สำเร็จ: ${result.error||"unknown"}`
          )
          return
        }

        localStorage.setItem("lekhub_line_admin_token",String(result.sessionToken))
        window.location.replace("/admin/settings")
      }catch(error){
        if(active)setMessage("เปิดหน้าตั้งค่าไม่สำเร็จ กรุณาลองใหม่")
      }
    })()

    return()=>{active=false}
  },[])

  return(
    <main style={{
      minHeight:"100dvh",
      display:"grid",
      placeItems:"center",
      padding:24,
      fontFamily:"Arial, sans-serif",
      background:"#f7f7f8",
      color:"#111"
    }}>
      <div style={{
        width:"min(100%,420px)",
        background:"#fff",
        border:"1px solid #e5e7eb",
        borderRadius:18,
        padding:24,
        textAlign:"center",
        boxShadow:"0 8px 30px rgba(0,0,0,.06)"
      }}>
        <b style={{fontSize:20}}>LekHub</b>
        <p style={{margin:"14px 0 0"}}>{message}</p>
      </div>
    </main>
  )
}
