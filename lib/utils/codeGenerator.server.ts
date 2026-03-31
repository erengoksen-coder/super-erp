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


