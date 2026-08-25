import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "../../../lib/supabase/server"

function safeAdminPath(value: string | null) {
  return value?.startsWith("/admin") && !value.startsWith("//") && value !== "/admin/login"
    ? value
    : "/admin"
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const destination = safeAdminPath(request.nextUrl.searchParams.get("next"))
  const loginUrl = new URL("/admin/login", request.url)

  if (!code) {
    loginUrl.searchParams.set("error", "missing_code")
    return NextResponse.redirect(loginUrl)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    loginUrl.searchParams.set("error", "invalid_link")
    return NextResponse.redirect(loginUrl)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    loginUrl.searchParams.set("error", "unauthenticated")
    return NextResponse.redirect(loginUrl)
  }

  const { data: adminProfile } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (!adminProfile) {
    await supabase.auth.signOut()
    loginUrl.searchParams.set("error", "forbidden")
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(new URL(destination, request.url))
}
