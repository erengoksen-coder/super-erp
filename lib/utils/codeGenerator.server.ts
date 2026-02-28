/**
 * Server-side only kod üretme fonksiyonları
 * Bu dosya sadece API route'larda kullanılmalıdır
 */

/**
 * Sevkiyat numarası üretir (Server-side only)
 * NOT: Bu fonksiyon sadece API route'larda kullanılmalıdır
 */
export async function generateShipmentNumber(): Promise<string> {
  try {
    // Dynamic import to avoid client-side bundling
    const { getDatabase } = await import('@/lib/database/db')
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')

    // Bugünkü sevkiyat sayısını al
    const count = db.prepare(`
      SELECT COUNT(*) as count 
      FROM shipments 
      WHERE shipment_number LIKE ?
    `).get(`SEVK-${today}%`) as any

    const sequence = String((count?.count || 0) + 1).padStart(4, '0')
    return `SEVK-${today}-${sequence}`
  } catch {
    // Fallback
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    return `SEVK-${today}-0001`
  }
}
/**
 * Üretim emri numarası üretir (Server-side)
 */
export async function generateProductionOrderNumber(): Promise<string> {
  try {
    const { getDatabase } = await import('@/lib/database/db')
    const db = getDatabase()

    const lastRow = db.prepare(`
      SELECT order_number 
      FROM production_orders 
      WHERE order_number LIKE 'URE-%'
      ORDER BY order_number DESC 
      LIMIT 1
    `).get() as { order_number: string } | undefined

    if (!lastRow) {
      return 'URE-001'
    }

    const lastNum = parseInt(lastRow.order_number.replace('URE-', ''), 10)
    const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1
    return `URE-${String(nextNum).padStart(3, '0')}`
  } catch {
    return 'URE-001'
  }
}
