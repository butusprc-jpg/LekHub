import { NextResponse, type NextRequest } from "next/server"

export function middleware(_request: NextRequest) {
  // Admin authorization is handled by the LINE admin session inside /admin pages.
  // Do NOT gate these routes with the old Supabase Auth JWT middleware:
  // it caused /admin/* -> /admin/login redirect loops in the LINE in-app browser.
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
