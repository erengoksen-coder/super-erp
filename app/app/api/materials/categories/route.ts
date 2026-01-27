import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Tüm hammadde kategorilerini getir
export async function GET() {
  try {
    // Koltuk imalatında kullanılan temel malzeme kategorileri
    const defaultCategories = [
      { id: 'kumas', name: 'Kumaş', description: 'Koltuk kumaşları ve döşemelik kumaşlar' },
      { id: 'sünger', name: 'Sünger', description: 'Koltuk süngerleri ve yastık süngerleri' },
      { id: 'hirdavat', name: 'Hırdavat', description: 'Vida, çivi, cıvata, somun vb.' },
      { id: 'ahşap', name: 'Ahşap', description: 'Koltuk iskeleti için ahşap malzemeler' },
      { id: 'metal', name: 'Metal', description: 'Koltuk iskeleti için metal parçalar' },
      { id: 'döşeme', name: 'Döşeme', description: 'Döşeme malzemeleri ve aksesuarlar' },
      { id: 'aksesuar', name: 'Aksesuar', description: 'Koltuk aksesuarları ve süslemeler' },
      { id: 'yapıştırıcı', name: 'Yapıştırıcı', description: 'Tutkal, yapıştırıcı ve yapışkan malzemeler' },
      { id: 'boya', name: 'Boya', description: 'Ahşap ve metal boyaları' },
      { id: 'ambalaj', name: 'Ambalaj', description: 'Paketleme ve ambalaj malzemeleri' },
      { id: 'diğer', name: 'Diğer', description: 'Diğer malzemeler' },
    ]

    const db = getDatabase()

    // Veritabanından mevcut kategorileri al
    const existingCategories = db.prepare(`
      SELECT DISTINCT category as name
      FROM materials
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `).all() as any[]

    // Mevcut kategorileri default listesine ekle
    const allCategories = [...defaultCategories]
    existingCategories.forEach((cat: any) => {
      if (!defaultCategories.find(dc => dc.name.toLowerCase() === cat.name.toLowerCase())) {
        allCategories.push({
          id: cat.name.toLowerCase().replace(/\s+/g, '-'),
          name: cat.name,
          description: '',
        })
      }
    })

    return NextResponse.json({
      categories: allCategories,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni kategori ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Kategori adı gerekli' },
        { status: 400 }
      )
    }

    // Kategori zaten varsa hata verme, sadece başarılı dön
    return NextResponse.json({
      success: true,
      message: 'Kategori başarıyla eklendi',
      category: {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name.trim(),
        description: description || '',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

