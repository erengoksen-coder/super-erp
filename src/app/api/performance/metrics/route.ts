import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { rateLimit } from '@/lib/api/rateLimit'

export async function GET(request: NextRequest) {
  try {
    const limit = rateLimit(request, {
      keyPrefix: 'metrics',
      max: 60,
      windowMs: 60_000,
    })
    if (!limit.allowed) {
      return fail('Çok fazla istek', { status: 429 })
    }

    const db = getDatabase()
    
    const mem = process.memoryUsage()
    const cpu = process.cpuUsage()
    
    const metrics = {
      system: {
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          rss: Math.round(mem.rss / 1024 / 1024),
          external: Math.round(mem.external / 1024 / 1024),
        },
        cpu: {
          user: cpu.user,
          system: cpu.system,
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
      database: {
        // Tablo sayıları
        tables: {
          users: (db.prepare('SELECT COUNT(*) as c FROM users WHERE deleted_at IS NULL').get() as any)?.c || 0,
          orders: (db.prepare('SELECT COUNT(*) as c FROM orders WHERE deleted_at IS NULL').get() as any)?.c || 0,
          products: (db.prepare('SELECT COUNT(*) as c FROM products WHERE deleted_at IS NULL').get() as any)?.c || 0,
          materials: (db.prepare('SELECT COUNT(*) as c FROM materials WHERE deleted_at IS NULL').get() as any)?.c || 0,
          shipments: (db.prepare('SELECT COUNT(*) as c FROM shipments WHERE deleted_at IS NULL').get() as any)?.c || 0,
          invoices: (db.prepare('SELECT COUNT(*) as c FROM invoices WHERE deleted_at IS NULL').get() as any)?.c || 0,
          audit_logs: (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as any)?.c || 0,
        },
        // Veritabanı dosya boyutu
        dbSize: getDbSize(),
      },
      timestamp: new Date().toISOString(),
      rateLimit: {
        remaining: limit.remaining,
        reset: limit.reset,
      },
    }

    return ok(metrics)
  } catch (error) {
    console.error('Metrics error:', error)
    return fail('Metrik alınamadı', { status: 500 })
  }
}

function getDbSize(): number {
  try {
    const { existsSync, statSync } = require('fs')
    const path = process.env.DATABASE_PATH || require('path').join(process.cwd(), 'data', 'erp.db')
    if (existsSync(path)) {
      return Math.round(statSync(path).size / 1024 / 1024)
    }
  } catch {}
  return 0
}
