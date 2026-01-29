import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// DELETE: Bir ürünün BOM kayıtlarını sil (versiyona göre)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const versionId = searchParams.get('version_id')

    if (!productId) {
      return NextResponse.json({ error: 'product_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    
    // Ürün kontrolü
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    let resolvedVersionId = versionId
    if (!resolvedVersionId) {
      const active = db.prepare(`
        SELECT id FROM bom_versions
        WHERE product_id = ? AND is_active = 1 AND deleted_at IS NULL
        ORDER BY version_no DESC
        LIMIT 1
      `).get(productId) as { id: string } | undefined
      resolvedVersionId = active?.id
    }

    const result = resolvedVersionId
      ? db.prepare(`
          UPDATE bom
          SET deleted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = ? AND version_id = ?
        `).run(productId, resolvedVersionId)
      : db.prepare(`
          UPDATE bom
          SET deleted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = ?
        `).run(productId)

    return NextResponse.json({
      success: true,
      message: resolvedVersionId ? 'Ürünün seçili BOM versiyonu silindi' : 'Ürünün tüm BOM kayıtları silindi',
      deleted_count: result.changes,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


