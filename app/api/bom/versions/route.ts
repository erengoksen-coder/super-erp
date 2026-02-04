import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'

type BomVersionRow = {
  id: string
  product_id: string
  version_no: number
  effective_date: string
  revision_reason: string | null
  is_active: number
  created_at: string
}

// GET: �Srün için BOM versiyonlarını getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    if (!productId) {
      return NextResponse.json({ error: 'product_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const versions = db.prepare(`
      SELECT *
      FROM bom_versions
      WHERE product_id = ? AND deleted_at IS NULL
      ORDER BY version_no DESC
    `).all(productId) as BomVersionRow[]

    return NextResponse.json(versions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni BOM versiyonu oluştur (opsiyonel kopyalama)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const raw = await request.text()
    let body: any = null
    if (raw && raw.trim()) {
      try {
        body = JSON.parse(raw)
      } catch {
        const params = new URLSearchParams(raw)
        body = Object.fromEntries(params.entries())
      }
    } else {
      body = {}
    }
    const {
      product_id,
      effective_date,
      revision_reason,
      copy_from_version_id
    } = body as {
      product_id?: string
      effective_date?: string
      revision_reason?: string
      copy_from_version_id?: string
    }

    if (!product_id) {
      return NextResponse.json({ error: 'product_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const product = db.prepare('SELECT id FROM active_products WHERE id = ?').get(product_id) as { id: string } | undefined
    if (!product) {
      return NextResponse.json({ error: '�Srün bulunamadı' }, { status: 404 })
    }

    const latest = db.prepare(`
      SELECT MAX(version_no) as max_version
      FROM bom_versions
      WHERE product_id = ? AND deleted_at IS NULL
    `).get(product_id) as { max_version: number | null }
    const nextVersion = (latest?.max_version || 0) + 1

    const versionId = randomUUID()
    const entryDate = effective_date || new Date().toISOString().split('T')[0]

    db.transaction(() => {
      // Eski versiyonları pasifleştir
      db.prepare(`
        UPDATE bom_versions
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ? AND deleted_at IS NULL
      `).run(product_id)

      // Yeni versiyonu ekle
      db.prepare(`
        INSERT INTO bom_versions
        (id, product_id, version_no, effective_date, revision_reason, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        versionId,
        product_id,
        nextVersion,
        entryDate,
        revision_reason || null
      )

      const previous = db.prepare(`
        SELECT id FROM bom_versions
        WHERE product_id = ? AND version_no = ?
      `).get(product_id, nextVersion - 1) as { id: string } | undefined
      const sourceVersionId = copy_from_version_id || previous?.id

      if (sourceVersionId) {
        const sourceItems = db.prepare(`
          SELECT * FROM bom
          WHERE product_id = ? AND version_id = ? AND deleted_at IS NULL
        `).all(product_id, sourceVersionId) as Array<any>

        if (sourceItems.length > 0) {
          const idMap = new Map<string, string>()
          for (const item of sourceItems) {
            idMap.set(item.id, randomUUID())
          }

          const insertItem = db.prepare(`
            INSERT INTO bom
            (id, version_id, product_id, material_id, parent_id, quantity_required, unit, fire_percentage, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `)
          for (const item of sourceItems) {
            insertItem.run(
              idMap.get(item.id),
              versionId,
              item.product_id,
              item.material_id,
              item.parent_id ? idMap.get(item.parent_id) : null,
              item.quantity_required,
              item.unit || null,
              item.fire_percentage ?? 0
            )
          }
        }
      }
    })()

    return NextResponse.json({ id: versionId, version_no: nextVersion }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

