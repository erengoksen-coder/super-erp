import { NextRequest, NextResponse } from 'next/server'
import { generateCsrfToken, setCsrfCookie } from '@/lib/auth/csrf'

export async function GET(request: NextRequest) {
  const token = generateCsrfToken()
  const response = NextResponse.json({ csrfToken: token })
  setCsrfCookie(response, token)
  return response
}
