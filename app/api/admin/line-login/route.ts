import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { ADMIN_COOKIE } from "../../../../lib/admin-session"

export const runtime = "nodejs"

type LineProfile = {
  userId?: string
  displayName?: string
  pictureUrl?: string
}

function supabaseClient() {
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { accessToken?: string } | null
    const accessToken = body?.accessToken?.trim()

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "missing_line_access_token" }, { status: 400 })
    }

    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })

    if (!profileResponse.ok) {
      return NextResponse.json({ ok: false, error: "line_token_invalid" }, { status: 401 })
    }

    const profile = await profileResponse.json() as LineProfile
    if (!profile.userId || !profile.displayName) {
      return NextResponse.json({ ok: false, error: "line_profile_invalid" }, { status: 401 })
    }

    const { data, error } = await supabaseClient().rpc("lekhub_line_admin_login", {
      p_line_user_id: profile.userId,
      p_display_name: profile.displayName,
      p_picture_url: profile.pictureUrl || null,
    })

    if (error) {
      console.error("LINE admin RPC failed", error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    if (!data?.ok || !data?.session_token) {
      return NextResponse.json(
        { ok: false, error: data?.error || "line_user_not_admin" },
        { status: data?.error === "line_user_not_admin" ? 403 : 401 },
      )
    }

    const response = NextResponse.json(
      {
        ok: true,
        displayName: data.display_name || profile.displayName,
        role: data.role || "admin",
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    )

    response.cookies.set(ADMIN_COOKIE, String(data.session_token), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 12,
    })

    return response
  } catch (error) {
    console.error("LINE admin login failed", error)
    return NextResponse.json({ ok: false, error: "admin_login_failed" }, { status: 500 })
  }
}
