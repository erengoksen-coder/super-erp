import { NextResponse } from 'next/server'

// 1x1 şeffaf PNG (base64) – manifest her zaman geçerli görsel alsın
const FALLBACK_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const FALLBACK_PNG = Buffer.from(FALLBACK_B64, 'base64')

const headers: Record<string, string> = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=86400',
}

/** PWA manifest ikonu – geçerli 1x1 PNG döner (manifest uyarısını önler). */
export async function GET() {
  return new NextResponse(FALLBACK_PNG, { headers })
}
