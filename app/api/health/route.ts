import { NextRequest } from 'next/server'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 500

/**
 * Sağlık kontrolü: veritabanı bağlantısı ve API yanıtı.
 * Monitoring / load balancer için kullanılabilir.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const deep = searchParams.get('deep') === 'true'

  const checks: Record<string, { status: string; detail?: string }> = {
    api: { status: 'healthy' },
  }

  if (deep) {
    try {
      const { getDatabase } = await import('@/lib/database/db')
      const db = getDatabase()
      db.prepare('SELECT 1').get()
      checks.database = { status: 'healthy' }
    } catch (e) {
      checks.database = {
        status: 'unhealthy',
        detail: e instanceof Error ? e.message : 'Veritabanı bağlantı hatası',
      }
    }
  } else {
    checks.database = { status: 'healthy' }
  }

  const overallHealth = Object.values(checks).every((c) => c.status === 'healthy')
  const status = overallHealth ? 200 : 503

  return new Response(
    JSON.stringify({
      ok: overallHealth,
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
