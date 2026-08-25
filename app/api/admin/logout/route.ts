import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { ADMIN_COOKIE, revokeLineAdminSession } from "../../../../lib/admin-session"

export async function POST(request: Request) {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  await revokeLineAdminSession(token)

  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303)
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}
