import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import { AuditService } from '@/lib/services/audit'

// GET: Tüm ayarları getir
async function getSettings(req: NextRequest) {
  try {
    const db = getDatabase()
    const settings = db.prepare('SELECT * FROM system_settings WHERE company_id = ?').all(DEFAULT_COMPANY_ID)
    
    // Key-Value objesine dönüştür
    const settingsObj = (settings as any[]).reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json(settingsObj)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Ayarları güncelle
async function updateSettings(req: NextRequest, user: any) {
  try {
    const body = await req.json()
    const db = getDatabase()
    
    const updateStmt = db.prepare(`
      INSERT INTO system_settings (id, key, value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `)

    const transaction = db.transaction((settings: Record<string, string>) => {
      for (const [key, value] of Object.entries(settings)) {
        updateStmt.run(`set_${key}`, key, String(value))
      }
    })

    transaction(body)

    // Log the action
    await AuditService.log({
      userId: user.userId,
      companyId: DEFAULT_COMPANY_ID,
      branchId: DEFAULT_BRANCH_ID,
      actionType: 'UPDATE',
      entityName: 'system_settings',
      description: 'System settings updated',
      newData: body
    })

    return NextResponse.json({ message: 'Ayarlar başarıyla güncellendi.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const GET = withAuth(getSettings)
export const PUT = withAuth(updateSettings)
