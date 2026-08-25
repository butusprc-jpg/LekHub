import crypto from "node:crypto"
import { cookies } from "next/headers"

export const ADMIN_COOKIE = "lekhub_line_admin"

type AdminSession = {
  userId: string
  displayName: string
  exp: number
}

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET?.trim()
  if (!value || value.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters")
  }
  return value
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function signature(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url")
}

export function createAdminSessionToken(
  input: Omit<AdminSession, "exp">,
  ttlSeconds = 60 * 60 * 12,
) {
  const session: AdminSession = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const payload = encode(JSON.stringify(session))
  return `${payload}.${signature(payload)}`
}

export function verifyAdminSessionToken(token?: string | null): AdminSession | null {
  if (!token) return null

  const [payload, sig] = token.split(".")
  if (!payload || !sig) return null

  const expected = signature(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(decode(payload)) as AdminSession
    if (!parsed.userId || !parsed.displayName || !parsed.exp) return null
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}

export async function getLineAdminSession() {
  const store = await cookies()
  return verifyAdminSessionToken(store.get(ADMIN_COOKIE)?.value)
}
