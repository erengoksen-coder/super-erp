import { getDatabase } from './database/db'

export interface MaterialRequirement {
  material_id: string
  material_code: string
  material_name: string
  unit: string
  required_qty: number
  in_stock: number
  reserved_qty: number
  available_qty: number
  shortage_qty: number
}

export async function calculateRequirements(companyId: string, branchId: string): Promise<MaterialRequirement[]> {
  const db = getDatabase()
  
  // 1. Bekleyen ve Üretimdeki Siparişleri Getir
  const orders = db.prepare(`
    SELECT id, product_id, quantity 
    FROM orders 
    WHERE status IN ('pending', 'in_production') 
      AND (company_id = ? AND branch_id = ?)
      AND deleted_at IS NULL
  `).all(companyId, branchId) as any[]

  const requirementsMap = new Map<string, { qty: number; name: string; code: string; unit: string }>()

  // 2. Her Sipariş İçin Reçete (BOM) Patlat (Explode)
  for (const order of orders) {
    // Aktif BOM versiyonunu bul
    const bomItems = db.prepare(`
      SELECT b.material_id, b.quantity_required, b.fire_percentage, 
             m.name as material_name, m.code as material_code, m.unit
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id
      JOIN materials m ON b.material_id = m.id
      WHERE bv.product_id = ? AND bv.is_active = 1 
        AND bv.company_id = ? AND bv.branch_id = ?
        AND b.deleted_at IS NULL
    `).all(order.product_id, companyId, branchId) as any[]

    for (const item of bomItems) {
      const fireMultiplier = 1 + (item.fire_percentage || 0) / 100
      const totalNeeded = order.quantity * item.quantity_required * fireMultiplier
      
      const existing = requirementsMap.get(item.material_id) || { 
        qty: 0, 
        name: item.material_name, 
        code: item.material_code, 
        unit: item.unit 
      }
      existing.qty += totalNeeded
      requirementsMap.set(item.material_id, existing)
    }
  }

  // 3. Stok Durumu ve Rezervasyonları Çek
  const result: MaterialRequirement[] = []
  
  const entries = Array.from(requirementsMap.entries())
  for (const [materialId, req] of entries) {
    // Toplam girişi hesapla (stok hareketi 'in')
    const totalIn = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM stock_movements
      WHERE material_id = ? AND movement_type = 'in' AND company_id = ? AND branch_id = ?
    `).get(materialId, companyId, branchId) as any
    
    // Toplam çıkışı hesapla (stok hareketi 'out')
    const totalOut = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM stock_movements
      WHERE material_id = ? AND movement_type = 'out' AND company_id = ? AND branch_id = ?
    `).get(materialId, companyId, branchId) as any

    const inStock = totalIn.total - totalOut.total

    // Rezervasyonları hesapla
    const reserved = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM stock_reservations
      WHERE material_id = ? AND status = 'active' AND company_id = ? AND branch_id = ?
    `).get(materialId, companyId, branchId) as any

    const available = inStock - reserved.total
    const shortage = Math.max(0, req.qty - available)

    result.push({
      material_id: materialId,
      material_code: req.code,
      material_name: req.name,
      unit: req.unit,
      required_qty: Number(req.qty.toFixed(4)),
      in_stock: Number(inStock.toFixed(4)),
      reserved_qty: Number(reserved.total.toFixed(4)),
      available_qty: Number(available.toFixed(4)),
      shortage_qty: Number(shortage.toFixed(4))
    })
  }

  return result.sort((a, b) => b.shortage_qty - a.shortage_qty)
}
