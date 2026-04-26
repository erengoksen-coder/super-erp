import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import fs from 'fs'
import path from 'path'

async function downloadBackup(req: NextRequest, user: any) {
  // Sadece admin yetkisi olanlar yedek alabilir
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 })
  }

  try {
    const dbPath = path.join(process.cwd(), 'data', 'erp.db')
    
    if (!fs.existsSync(dbPath)) {
      // Fallback to legacy path if not found in data/
      const legacyPath = path.join(process.cwd(), 'erp.db')
      if (!fs.existsSync(legacyPath)) {
        return NextResponse.json({ error: 'Veritabanı dosyası bulunamadı.' }, { status: 404 })
      }
      const fileBuffer = fs.readFileSync(legacyPath)
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="super-erp-backup-${new Date().toISOString().split('T')[0]}.db"`
        }
      })
    }

    const fileBuffer = fs.readFileSync(dbPath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="super-erp-backup-${new Date().toISOString().split('T')[0]}.db"`
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const GET = withAuth(downloadBackup)
