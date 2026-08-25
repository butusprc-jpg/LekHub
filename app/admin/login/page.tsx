"use client"

import { useEffect, useState } from "react"
import { createClient } from "../../../lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    createClient().auth.getUser().then(({data}) => {
      if (!data.user) return
      const requestedPath = new URLSearchParams(window.location.search).get("next")
      window.location.replace(requestedPath?.startsWith("/admin") && !requestedPath.startsWith("//") ? requestedPath : "/admin")
    })
  }, [])

  async function sendMagicLink() {
    setError("")
    setMessage("")
    if (!email) {
      setError("กรุณากรอกอีเมลก่อน")
      return
    }

    setLoading(true)
    try {
      const requestedPath = new URLSearchParams(window.location.search).get("next")
      const nextPath = requestedPath?.startsWith("/admin") && !requestedPath.startsWith("//")
        ? requestedPath
        : "/admin"
      const redirectTo = new URL("/auth/callback", window.location.origin)
      redirectTo.searchParams.set("next", nextPath)

      const supabase = createClient()
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo.toString(),
          shouldCreateUser: false,
        },
      })
      if (magicLinkError) throw magicLinkError
      setMessage("ส่งลิงก์เข้าสู่ระบบแล้ว กรุณาตรวจอีเมล")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ส่งลิงก์ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return <main>
    <h1>เข้าสู่ระบบหลังบ้าน</h1>
    <form onSubmit={event=>{event.preventDefault();sendMagicLink()}}>
      <label>อีเมล<input autoComplete="email" inputMode="email" type="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button disabled={loading} type="submit">{loading ? "กำลังส่ง..." : "ส่งลิงก์เข้าอีเมล"}</button>
    </form>
  </main>
}
