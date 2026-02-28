import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase, getDatabasePath } from '@/lib/database/db'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { existsSync, mkdirSync, copyFileSync } from 'fs'
import { dirname, join } from 'path'

/**
 * POST: Veritabanının kopyasını data/backups/ altına alır ve son yedekleme tarihini günceller.
 * Sadece admin. Mevcut işlemleri bozmaz (copyFileSync ile salt okunur kopya).
 */
export const POST = withAuth(async (_request, user) => {
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  try {
    const dbPath = getDatabasePath()
    if (!existsSync(dbPath)) {
      return NextResponse.json({ error: 'Veritabanı dosyası bulunamadı' }, { status: 404 })
    }
    const dataDir = dirname(dbPath)
    const backupDir = join(dataDir, 'backups')
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true })
    }
    const now = new Date()
    const stamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, (c) => (c === 'T' ? '_' : c))
    const backupPath = join(backupDir, `erp_${stamp}.db`)
    copyFileSync(dbPath, backupPath)
    const db = getDatabase()
    const iso = now.toISOString()
    db.prepare("INSERT OR REPLACE INTO _app_meta (key, value) VALUES ('last_backup_at', ?)").run(iso)
    return NextResponse.json({
      success: true,
      message: 'Yedek oluşturuldu',
      backupPath,
      lastBackupAt: iso,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Yedekleme başarısız'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}, ['admin'])
