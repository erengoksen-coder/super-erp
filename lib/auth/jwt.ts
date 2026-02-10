import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'

const ACCESS_TOKEN_TTL = '8h'

export type AccessTokenPayload = JWTPayload & {
  userId: string
  role: string
  username: string
  permissions?: Array<{
    page_path: string
    can_view: number
    can_create: number
    can_edit: number
    can_delete: number
  }>
}

let _secret: Uint8Array | null = null
function getSecret(): Uint8Array {
  if (!_secret) {
    const raw = process.env.JWT_SECRET
    if (!raw || raw.trim().length < 16) {
      throw new Error('JWT_SECRET environment variable is required (min 16 characters). Add it to .env.local and restart the server.')
    }
    _secret = new TextEncoder().encode(raw)
  }
  return _secret
}

export async function createToken(payload: { userId: string; role: string } & Partial<AccessTokenPayload>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret())
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as AccessTokenPayload
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null
  return await verifyToken(token)
}

export async function signAccessToken(payload: AccessTokenPayload) {
  return createToken(payload)
}

export async function verifyAccessToken(token: string) {
  const verified = await verifyToken(token)
  if (!verified) {
    throw new Error('Geçersiz token')
  }
  return verified
}

export const accessTokenTtlSeconds = 8 * 60 * 60
