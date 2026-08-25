"use client"

import { useEffect, useState } from "react"
import { initLIFF } from "../../../lib/liff"

export default function LoginPage() {
  const [message, setMessage] = useState("กำลังตรวจสอบสิทธิ์ LINE OA...")
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function login() {
      try {
        const line = await initLIFF()
        if (!line || cancelled) return

        const accessToken = line.liff.getAccessToken()
        if (!accessToken) throw new Error("ไม่พบ LINE access token")

        const response = await fetch("/api/admin/line-login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ accessToken }),
        })

        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result.ok) {
          if (result.error === "line_user_not_admin") {
            throw new Error("LINE นี้ไม่มีสิทธิ์เข้าหลังบ้าน")
          }
          throw new Error(result.error || "ตรวจสอบสิทธิ์ไม่สำเร็จ")
        }

        const requestedPath = new URLSearchParams(window.location.search).get("next")
        const nextPath =
          requestedPath?.startsWith("/admin") && !requestedPath.startsWith("//")
            ? requestedPath
            : "/admin"

        if (!result.sessionToken) throw new Error("ไม่ได้รับ admin session token")
        localStorage.setItem("lekhub_line_admin_token", String(result.sessionToken))
        setMessage(`ยืนยันสิทธิ์แล้ว: ${result.displayName || line.profile.displayName}`)
        // The login API already created the server-side LINE admin session and Set-Cookie.
        // Use a full document navigation so Server Components receive the new cookie.
        await new Promise(resolve => window.setTimeout(resolve, 150))
        window.location.replace(nextPath)
      } catch (caught) {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : "เข้าสู่หลังบ้านไม่สำเร็จ")
        setMessage("")
      }
    }

    login()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main style={{maxWidth:520, margin:"60px auto", padding:24, textAlign:"center"}}>
      <h1>LekHub หลังบ้าน</h1>
      {message && <p role="status">{message}</p>}
      {error && <>
        <p role="alert" style={{color:"#b00020", fontWeight:700}}>{error}</p>
        <button type="button" onClick={()=>window.location.reload()}>ลองเข้าอีกครั้ง</button>
      </>}
      <p>เปิดหน้านี้ผ่าน LINE OA ระบบจะตรวจสิทธิ์แอดมินให้อัตโนมัติ</p>
    </main>
  )
}
