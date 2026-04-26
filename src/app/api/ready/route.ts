import { NextResponse } from 'next/server'

/**
 * Readiness probe: veritabanı erişilebilir mi?
 * Kubernetes / load balancer / Docker HEALTHCHECK için.
 * 200 = trafik alabilir, 503 = hazır değil.
 */
export async function GET() {
  try {
    const { getDatabase } = await import('@/lib/database/db')
    const db = getDatabase()
    db.prepare('SELECT 1').get()
    return NextResponse.json({ ready: true }, { status: 200 })
  } catch (e) {
    return NextResponse.json(
      { ready: false, error: e instanceof Error ? e.message : 'Database unavailable' },
      { status: 503 }
    )
  }
}
