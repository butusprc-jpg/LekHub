"use client"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { initLIFF } from "./liff"

const STORAGE_KEY = "lekhub_line_admin_token"

function browserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()

  if (!url || !key) throw new Error("Missing Supabase environment variables")

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type ClientAdminSession = {
  token: string
  displayName: string
  role: string
}

export function clearClientAdminSession() {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY)
}

async function validateToken(token: string): Promise<ClientAdminSession | null> {
  const { data, error } = await browserSupabase().rpc("lekhub_check_line_admin_session", {
    p_token: token,
  })

  if (error || !data?.ok) return null

  return {
    token,
    displayName: String(data.display_name || "LINE Admin"),
    role: String(data.role || "admin"),
  }
}

export async function ensureLineAdminSession(): Promise<ClientAdminSession> {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) {
    const valid = await validateToken(existing)
    if (valid) return valid
    localStorage.removeItem(STORAGE_KEY)
  }

  const line = await initLIFF()
  if (!line) throw new Error("กำลังเปิด LINE login กรุณารอสักครู่")

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
  if (!response.ok || !result.ok || !result.sessionToken) {
    if (result.error === "line_user_not_admin") throw new Error("LINE นี้ไม่มีสิทธิ์เข้าหลังบ้าน")
    throw new Error(result.error || "เข้าสู่หลังบ้านไม่สำเร็จ")
  }

  const token = String(result.sessionToken)
  localStorage.setItem(STORAGE_KEY, token)

  const valid = await validateToken(token)
  if (!valid) {
    localStorage.removeItem(STORAGE_KEY)
    throw new Error("สร้าง session แล้วแต่ตรวจสอบสิทธิ์ซ้ำไม่ผ่าน")
  }

  return valid
}

export async function adminRpc(
  session: ClientAdminSession,
  name: string,
  args: Record<string, unknown> = {},
) {
  return browserSupabase().rpc(name, {
    p_token: session.token,
    ...args,
  })
}
