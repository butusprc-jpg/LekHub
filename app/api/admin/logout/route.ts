import { NextResponse } from "next/server"
import { ADMIN_COOKIE } from "../../../../lib/admin-session"

export async function POST(request: Request) {
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
