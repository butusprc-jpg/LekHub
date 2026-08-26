import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { ADMIN_COOKIE } from "../../../../lib/admin-session"
import { verifyLineMember } from "../../../../lib/server/line-member"

export const runtime = "nodejs"

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

    const profile = await verifyLineMember(accessToken)
    const { data, error } = await supabaseClient().rpc("lekhub_line_admin_login_v2", {
      p_channel_id: profile.channelId,
      p_line_user_id: profile.userId,
      p_display_name: profile.displayName,
      p_picture_url: profile.pictureUrl,
    })

    if (error) {
      console.error("LINE admin RPC failed", error)
      const status=String(error.message||"").includes("tenant_")?403:500
      return NextResponse.json({ ok: false, error: error.message }, { status })
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
        sessionToken:String(data.session_token),
        displayName: data.display_name || profile.displayName,
        role: data.role || "admin",
        tenantKey: data.tenant_key || null,
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
    const raw=error instanceof Error?error.message:"admin_login_failed"
    const lower=raw.toLowerCase()
    const expired=
      lower.includes("access token expired")||
      lower.includes("token expired")||
      lower.includes("invalid access token")
    const code=expired?"line_token_invalid":raw
    const status=expired||code.startsWith("line_")||code==="missing_line_access_token"?401:
      code.includes("tenant_")?403:500
    if(status===500)console.error("LINE admin login failed", error)
    return NextResponse.json({ ok: false, error: code }, { status })
  }
}
