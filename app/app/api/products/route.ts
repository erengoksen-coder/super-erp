import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Tüm ürünleri getir
export async function GET() {
  try {
    const db = getDatabase()
    const products = db.prepare('SELECT * FROM products ORDER BY sku').all()
    return NextResponse.json(products)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni ürün ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = getDatabase()
    
    const id = randomUUID()
    const { name, sku, price = 0 } = body

    db.prepare(`
      INSERT INTO products (id, name, sku, price)
      VALUES (?, ?, ?, ?)
    `).run(id, name, sku, price)

    return NextResponse.json({ id, ...body }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

