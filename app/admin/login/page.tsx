"use client"

import { FormEvent, useState } from "react"
import { createClient } from "../../../lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
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

  return <main>
    <h1>เข้าสู่ระบบหลังบ้าน</h1>
    <form onSubmit={login}>
      <label>อีเมล<input autoComplete="email" inputMode="email" type="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
      <label>รหัสผ่าน<input autoComplete="current-password" type="password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>
      {error && <p role="alert">{error}</p>}
      <button disabled={loading} type="submit">{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
    </form>
  </main>
}
