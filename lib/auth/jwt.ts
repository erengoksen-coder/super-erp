import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const ACCESS_TOKEN_TTL = '15m'

export type AccessTokenPayload = JWTPayload & {
  userId: string
  role: string
  username: string
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET ortam değişkeni gerekli')
    }
    return new TextEncoder().encode('dev-insecure-secret')
  }
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getJwtSecret())
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret())
  return payload as AccessTokenPayload
}

export const accessTokenTtlSeconds = 15 * 60
