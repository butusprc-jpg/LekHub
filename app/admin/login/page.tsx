"use client"

import { FormEvent, useState } from "react"
import { createClient } from "../../../lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) throw loginError

      const { data: { user } } = await supabase.auth.getUser()
      const { data: adminProfile } = user ? await supabase
        .from("admin_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle() : { data: null }

      if (!adminProfile) {
        await supabase.auth.signOut()
        throw new Error("บัญชีนี้ยังไม่ได้รับสิทธิ์แอดมิน LekHub")
      }

      const requestedPath = new URLSearchParams(window.location.search).get("next")
      const destination = requestedPath?.startsWith("/admin") && !requestedPath.startsWith("//") ? requestedPath : "/admin"
      window.location.replace(destination)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เข้าสู่ระบบไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

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
    <form onSubmit={login}>
      <label>อีเมล<input autoComplete="email" inputMode="email" type="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
      <label>รหัสผ่าน<input autoComplete="current-password" type="password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button disabled={loading} type="submit">{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
      <button disabled={loading} type="button" onClick={sendMagicLink}>ส่งลิงก์เข้าอีเมล</button>
    </form>
  </main>
}
