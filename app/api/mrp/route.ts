import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { randomUUID } from 'crypto'

type BomRow = {
  material_id: string
  quantity_required: number
  fire_percentage: number | null
  unit?: string | null
  material_name: string
  material_code: string | null
  material_unit: string
  material_unit_price: number | null
  supplier_name: string | null
  stock_amount: number | null
  reserved_quantity?: number | null
}

type MrpItem = {
  material_id: string
  material_name: string
  material_code: string | null
  unit: string
  unit_price: number
  required_quantity: number
  available_quantity: number
  shortage: number
  supplier_name: string | null
}

type ProductInfo = {
  id: string
  name: string
  sku: string
}

function toNumber(value: unknown, fallback = 0) {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

function calculateMrp(db: ReturnType<typeof getDatabase>, productId: string, quantity: number) {
  const product = db
    .prepare('SELECT id, name, sku FROM products WHERE id = ? AND deleted_at IS NULL')
    .get(productId) as ProductInfo | undefined

  if (!product) {
    return { error: 'Ürün bulunamadı' as const }
  }

  const bomRows = db.prepare(`
    SELECT 
      b.material_id,
      b.quantity_required,
      b.unit as unit,
      b.fire_percentage,
      m.name as material_name,
      m.code as material_code,
      m.unit as material_unit,
      m.unit_price as material_unit_price,
      m.stock_amount as stock_amount,
      m.reserved_quantity as reserved_quantity,
      a.name as supplier_name
    FROM bom b
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
    JOIN materials m ON b.material_id = m.id
    LEFT JOIN accounts a ON m.supplier_id = a.id
    WHERE b.product_id = ? AND b.deleted_at IS NULL AND m.deleted_at IS NULL
  `).all(productId) as BomRow[]

  if (!bomRows.length) {
    return { error: 'Reçete bulunamadı' as const }
  }

  const itemsMap = new Map<string, MrpItem>()
  for (const row of bomRows) {
    const fireFactor = 1 + (toNumber(row.fire_percentage, 0) / 100)
    const fromUnit = (row.unit || row.material_unit || '').toString()
    const toUnit = (row.material_unit || '').toString()
    const factor = resolveUnitFactor(db, row.material_id || null, fromUnit, toUnit)
    const baseRequired = toNumber(row.quantity_required, 0) * quantity * fireFactor
    const required = factor ? baseRequired * factor : baseRequired
    const existing = itemsMap.get(row.material_id)
    if (existing) {
      existing.required_quantity += required
      continue
    }
    itemsMap.set(row.material_id, {
      material_id: row.material_id,
      material_name: row.material_name,
      material_code: row.material_code,
      unit: row.material_unit,
      unit_price: toNumber(row.material_unit_price, 0),
      required_quantity: required,
      available_quantity: 0,
      shortage: 0,
      supplier_name: row.supplier_name,
    })
  }

  for (const item of itemsMap.values()) {
    const stockSum = db.prepare(`
      SELECT SUM(quantity) as quantity
      FROM material_stocks
      WHERE material_id = ?
    `).get(item.material_id) as { quantity?: number } | undefined
    const available = toNumber(stockSum?.quantity, 0)
    if (available > 0) {
      item.available_quantity = available
    } else {
      const fallback = bomRows.find((row) => row.material_id === item.material_id)?.stock_amount
      item.available_quantity = toNumber(fallback, 0)
    }
    const reservedFallback = bomRows.find((row) => row.material_id === item.material_id)?.reserved_quantity
    if (reservedFallback && reservedFallback > 0) {
      item.available_quantity = Math.max(item.available_quantity - reservedFallback, 0)
    }
    item.shortage = Math.max(item.required_quantity - item.available_quantity, 0)
  }

  const items = Array.from(itemsMap.values()).sort((a, b) => {
    if (b.shortage !== a.shortage) return b.shortage - a.shortage
    return a.material_name.localeCompare(b.material_name)
  })

  const totals = {
    total_required: items.reduce((sum, item) => sum + item.required_quantity, 0),
    total_shortage: items.reduce((sum, item) => sum + item.shortage, 0),
    shortage_count: items.filter((item) => item.shortage > 0).length,
  }

  return {
    product,
    quantity,
    items,
    totals,
  }
}

function generateRequestNumber(db: ReturnType<typeof getDatabase>) {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayStr = `${year}${month}${day}`

  const todayCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM purchase_requests 
    WHERE request_number LIKE ?
  `).get(`SAT-${todayStr}-%`) as { count?: number } | undefined

  let sequence = (todayCount?.count || 0) + 1
  let attempts = 0

  while (attempts < 100) {
    const requestNumber = `SAT-${todayStr}-${String(sequence).padStart(4, '0')}`
    const existing = db
      .prepare('SELECT id FROM purchase_requests WHERE request_number = ? AND deleted_at IS NULL')
      .get(requestNumber) as { id?: string } | undefined
    if (!existing) {
      return requestNumber
    }
    sequence++
    attempts++
  }

  return `SAT-${todayStr}-${randomUUID().slice(0, 4)}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const quantityParam = searchParams.get('quantity') || '1'
    const quantity = Number(quantityParam)

    if (!productId) {
      return NextResponse.json({ error: 'product_id gerekli' }, { status: 400 })
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'quantity pozitif olmalı' }, { status: 400 })
    }

    const db = getDatabase()
    const result = calculateMrp(db, productId, quantity)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id, quantity } = body || {}

    if (!product_id) {
      return NextResponse.json({ error: 'product_id gerekli' }, { status: 400 })
    }

    const planQty = Number(quantity || 1)
    if (!Number.isFinite(planQty) || planQty <= 0) {
      return NextResponse.json({ error: 'quantity pozitif olmalı' }, { status: 400 })
    }

    const db = getDatabase()
    const result = calculateMrp(db, product_id, planQty)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    const shortages = result.items.filter((item) => item.shortage > 0)
    if (!shortages.length) {
      return NextResponse.json({
        success: true,
        data: { created_count: 0, request_numbers: [] },
        message: 'Eksik malzeme bulunamadı',
      })
    }

    const insertRequest = db.prepare(`
      INSERT INTO purchase_requests 
      (id, request_number, material_id, requested_quantity, unit_price, total_amount, status, supplier_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `)

    const createRequests = db.transaction((items: MrpItem[]) => {
      const createdNumbers: string[] = []
      for (const item of items) {
        const requestNumber = generateRequestNumber(db)
        const id = randomUUID()
        const requestedQuantity = item.shortage
        const unitPrice = item.unit_price || 0
        const totalAmount = requestedQuantity * unitPrice
        const notes = `MRP: ${result.product.sku} x ${result.quantity}`

        insertRequest.run(
          id,
          requestNumber,
          item.material_id,
          requestedQuantity,
          unitPrice,
          totalAmount,
          item.supplier_name || null,
          notes
        )
        createdNumbers.push(requestNumber)
      }
      return createdNumbers
    })

    const requestNumbers = createRequests(shortages)

    return NextResponse.json({
      success: true,
      data: {
        created_count: requestNumbers.length,
        request_numbers: requestNumbers,
      },
      message: 'MRP satın alma talepleri oluşturuldu',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
