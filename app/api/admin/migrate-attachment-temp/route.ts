import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const SOURCE_URL =
  "https://uhpgnwclyzjnmnbrnglb.supabase.co/storage/v1/object/public/lekhub-uploads/U19cfc926ad325fcde5226ee1088a20e0/1787659071535-137390eb-3c65-44b4-9b24-a862d14eac7f.png"
const TENANT_KEY = "legacy-main"
const LINE_USER_ID = "U19cfc926ad325fcde5226ee1088a20e0"
const TEMP_SECRET = "lekhub-migrate-2026-08-30-xk9"

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get("secret") !== TEMP_SECRET) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }
  try {
    const res = await fetch(SOURCE_URL)
    if (!res.ok) throw new Error(`fetch_failed_${res.status}`)
    const buffer = await res.arrayBuffer()
    const path = `lekhub/${TENANT_KEY}/${LINE_USER_ID}/${Date.now()}-migrated.png`
    const blob = await put(path, Buffer.from(buffer), {
      access: "public",
      contentType: "image/png",
    })
    return NextResponse.json({ ok: true, url: blob.url })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    )
  }
}
