import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export const ADMIN_COOKIE = "lekhub_line_admin"

export type LineAdminSession = {
  userId: string
  displayName: string
  role: string
  token: string
}

function rpcClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()

  if (!url || !key) throw new Error("Missing Supabase environment variables")

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getLineAdminSession(): Promise<LineAdminSession | null> {
  try {
    const store = await cookies()
    const token = store.get(ADMIN_COOKIE)?.value
    if (!token) return null

    const { data, error } = await rpcClient().rpc("lekhub_check_line_admin_session", {
      p_token: token,
    })

    if (error || !data?.ok) return null

    return {
      userId: String(data.user_id),
      displayName: String(data.display_name),
      role: String(data.role || "admin"),
      token,
    }
  } catch {
    return null
  }
}

export async function revokeLineAdminSession(token?: string | null) {
  if (!token) return
  try {
    await rpcClient().rpc("lekhub_logout_line_admin_session", { p_token: token })
  } catch {}
}
