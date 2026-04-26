import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

export async function GET() {
  try {
    const db = getDatabase()
    const cwd = process.cwd()
    const envPath = process.env.DATABASE_PATH || 'not set'
    const actualDbFile = (db as any).name || 'unknown'
    
    // Mevcut kolonları kontrol et (Önce)
    const tableInfoBefore = db.prepare("PRAGMA table_info(accounts)").all() as any[]
    const beforeColumns = tableInfoBefore.map(c => c.name)

    const queries = [
      "ALTER TABLE accounts ADD COLUMN discount_rate REAL DEFAULT 0",
      "ALTER TABLE accounts ADD COLUMN authorized_person_name TEXT",
      "ALTER TABLE accounts ADD COLUMN authorized_person_phone TEXT"
    ]

    const results = []
    for (const q of queries) {
      const columnName = q.split('ADD COLUMN ')[1]?.split(' ')[0]
      if (beforeColumns.includes(columnName)) {
        results.push({ query: q, status: 'skipped_already_exists' })
        continue
      }

      try {
        db.exec(q)
        results.push({ query: q, status: 'success_applied' })
      } catch (e: any) {
        results.push({ query: q, status: 'error_failed', message: e.message })
      }
    }

    // Mevcut kolonları kontrol et (Sonra)
    const tableInfoAfter = db.prepare("PRAGMA table_info(accounts)").all() as any[]
    const afterColumns = tableInfoAfter.map(c => c.name)

    return NextResponse.json({ 
      success: true, 
      env: { cwd, envPath, actualDbFile },
      beforeColumns,
      afterColumns,
      results 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
