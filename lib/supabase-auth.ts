import { createClient } from "./supabase/server"

export type AdminAccess =
  | { ok: true; userId: string; email: string | null; role: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "configuration" }

export async function getAdminSession(): Promise<AdminAccess> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { ok: false, reason: "unauthenticated" }

    const { data: profile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    if (profileError || !profile) return { ok: false, reason: "forbidden" }
    return { ok: true, userId: user.id, email: user.email ?? null, role: profile.role }
  } catch {
    return { ok: false, reason: "configuration" }
  }
}

export async function checkAdminAccess() { return getAdminSession() }
