import { cookies } from "next/headers"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const ADMIN_COOKIE_NAME = "admin_session"
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 // 24h
const TOKEN_PREFIX = "v1"

type AdminSessionPayload = {
  exp: number
  nonce: string
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url")
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8")
}

function buildSignature(payloadPart: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadPart).digest("base64url")
}

function secureStringEquals(a: string, b: string): boolean {
  const first = Buffer.from(a)
  const second = Buffer.from(b)

  if (first.length !== second.length) {
    return false
  }

  return timingSafeEqual(first, second)
}

/**
 * Gets the admin cookie name for route handlers.
 */
export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME
}

/**
 * Gets the admin cookie max age in seconds.
 */
export function getAdminCookieMaxAge(): number {
  return COOKIE_MAX_AGE_SECONDS
}

/**
 * Validates whether the provided candidate password matches configured admin password.
 */
export function isValidAdminPassword(candidatePassword: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || !candidatePassword) {
    return false
  }

  return secureStringEquals(candidatePassword, adminPassword)
}

/**
 * Creates a signed admin session token with expiration.
 */
export function createAdminSessionToken(now: number = Date.now()): string {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is not configured")
  }

  const payload: AdminSessionPayload = {
    exp: Math.floor(now / 1000) + COOKIE_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("hex"),
  }

  const payloadPart = base64UrlEncode(JSON.stringify(payload))
  const signature = buildSignature(payloadPart, adminPassword)

  return `${TOKEN_PREFIX}.${payloadPart}.${signature}`
}

/**
 * Verifies a signed admin session token and expiration.
 */
export function verifyAdminSessionToken(token: string, now: number = Date.now()): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || !token) {
    return false
  }

  const parts = token.split(".")
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return false
  }

  const [, payloadPart, signaturePart] = parts
  const expectedSignature = buildSignature(payloadPart, adminPassword)

  if (!secureStringEquals(signaturePart, expectedSignature)) {
    return false
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart)) as AdminSessionPayload
    const nowSeconds = Math.floor(now / 1000)
    return Number.isFinite(payload.exp) && payload.exp > nowSeconds
  } catch {
    return false
  }
}

/**
 * Returns true when the current request has a valid admin session cookie.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return false
  }

  return verifyAdminSessionToken(sessionCookie.value)
}