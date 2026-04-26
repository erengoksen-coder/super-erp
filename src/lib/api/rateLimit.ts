import type { NextRequest } from 'next/server'

type RateLimitOptions = {
  keyPrefix: string
  max: number
  windowMs: number
}

type RateLimitEntry = {
  count: number
  reset: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  reset: number
}

const store = new Map<string, RateLimitEntry>()

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return 'unknown'
}

export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): RateLimitResult {
  const ip = getClientIp(request)
  const key = `${options.keyPrefix}:${ip}`
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || now > existing.reset) {
    const entry = { count: 1, reset: now + options.windowMs }
    store.set(key, entry)
    return {
      allowed: true,
      remaining: Math.max(0, options.max - 1),
      reset: entry.reset,
    }
  }

  existing.count += 1
  store.set(key, existing)

  return {
    allowed: existing.count <= options.max,
    remaining: Math.max(0, options.max - existing.count),
    reset: existing.reset,
  }
}
