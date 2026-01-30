import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: Malzeme QR kodunu oluştur veya getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('material_id')
    const code = searchParams.get('code') // QR kod içindeki kod

    const db = getDatabase()

    if (materialId) {
      // Material ID ile malzeme bilgisini getir
      const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId) as any
      if (!material) {
        return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
      }

      // QR kod içeriği: malzeme ID ve kod
      const qrData = JSON.stringify({
        type: 'material',
        id: material.id,
        code: material.code,
      })

      return NextResponse.json({
        material,
        qr_data: qrData,
        qr_url: `/mobile/material-stock?data=${encodeURIComponent(qrData)}`,
      })
    }

    if (code) {
      // QR kod içindeki data'yı parse et
      try {
        const qrData = JSON.parse(code)
        if (qrData.type === 'material' && qrData.id) {
          const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(qrData.id) as any
          if (!material) {
            return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
          }
          return NextResponse.json({ material })
        } else if (qrData.type === 'material' && qrData.code) {
          const material = db.prepare('SELECT * FROM materials WHERE code = ?').get(qrData.code) as any
          if (!material) {
            return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
          }
          return NextResponse.json({ material })
        }
      } catch (e) {
        // Eğer JSON değilse, direkt kod olarak dene
        const material = db.prepare('SELECT * FROM materials WHERE code = ?').get(code) as any
        if (material) {
          return NextResponse.json({ material })
        }
      }

      return NextResponse.json({ error: 'Geçersiz QR kod' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Malzeme ID veya kod gerekli' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: QR kod içeriğini parse et ve malzeme bilgisini döndür
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { qr_data } = body

    if (!qr_data) {
      return NextResponse.json({ error: 'QR kod verisi gerekli' }, { status: 400 })
    }

    let materialId: string | null = null
    let materialCode: string | null = null

    try {
      const parsed = JSON.parse(qr_data)
      if (parsed.type === 'material') {
        materialId = parsed.id || null
        materialCode = parsed.code || null
      }
    } catch (e) {
      // JSON değilse direkt kod olarak kabul et
      materialCode = qr_data
    }

    const db = getDatabase()
    let material: any = null

    if (materialId) {
      material = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId) as any
    } else if (materialCode) {
      material = db.prepare('SELECT * FROM materials WHERE code = ?').get(materialCode) as any
    }

    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({ material })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


