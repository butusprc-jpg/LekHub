import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(_request: NextRequest) {
  // Legacy compatibility only. LINE admin authorization is client-session based.
  return NextResponse.next()
}
