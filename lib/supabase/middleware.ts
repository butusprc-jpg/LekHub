import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const isLoginPage = request.nextUrl.pathname === "/admin/login"
  const isProtectedAdminPage = request.nextUrl.pathname.startsWith("/admin") && !isLoginPage

  if (!user && isProtectedAdminPage) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/admin/login"
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isProtectedAdminPage) {
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    if (!adminProfile) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/admin/login"
      loginUrl.search = ""
      loginUrl.searchParams.set("error", "forbidden")
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}
