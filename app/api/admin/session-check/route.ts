import { NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getLineAdminSession()
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "admin_session_missing" },
      { status: 401, headers: { "cache-control": "no-store" } },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      displayName: session.displayName,
      role: session.role,
    },
    { headers: { "cache-control": "no-store" } },
  )
}
