import { NextResponse } from "next/server"
import { ADMIN_COOKIE, createAdminSessionToken } from "../../../../lib/admin-session"

export const runtime = "nodejs"

type LineProfile = {
  userId?: string
  displayName?: string
  pictureUrl?: string
}

function allowedAdminIds() {
  return new Set(
    (process.env.LINE_ADMIN_USER_IDS || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean),
  )
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

    const allowlist = allowedAdminIds()
    if (!allowlist.size) {
      return NextResponse.json({ ok: false, error: "LINE_ADMIN_USER_IDS_not_configured" }, { status: 500 })
    }

    if (!allowlist.has(profile.userId)) {
      return NextResponse.json({ ok: false, error: "line_user_not_admin" }, { status: 403 })
    }

    const token = createAdminSessionToken({
      userId: profile.userId,
      displayName: profile.displayName,
    })

    const response = NextResponse.json({
      ok: true,
      displayName: profile.displayName,
    })

    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    })

    return response
  } catch (error) {
    console.error("LINE admin login failed", error)
    return NextResponse.json({ ok: false, error: "admin_login_failed" }, { status: 500 })
  }
}
