import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { logger } from '@/lib/utils/logger'
import { logAudit } from '@/lib/audit'

// POST: Üretim emirleri, barkodlar ve sevkiyat verilerini sil - Sadece admin
export const POST = withAuth(async (request: NextRequest, user: { userId: string }) => {
  try {
    const body = await request.json().catch(() => ({})) as { confirm?: boolean }
    if (body?.confirm !== true) {
      return NextResponse.json(
        { error: 'Bu işlem tehlikelidir. Onaylamak için body\'de { "confirm": true } gönderin.' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    logger.info('[TEMİZLEME] Üretim emirleri, barkodlar ve sevkiyat verileri siliniyor...')
    
    // Transaction içinde tüm silme işlemlerini yap
    const result = db.transaction(() => {
      let deletedCounts: Record<string, number> = {}
      
      // 1. Shipment Items (Sevkiyat Kalemleri) - Önce silinmeli (FOREIGN KEY)
      try {
        const deletedShipmentItems = db.prepare('DELETE FROM shipment_items').run()
        deletedCounts.shipment_items = deletedShipmentItems.changes
        logger.info(`[TEMİZLEME] ${deletedShipmentItems.changes} sevkiyat kalemi silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] shipment_items silinirken hata: ${e.message}`)
      }
      
      // 2. Shipments (Sevkiyatlar)
      try {
        const deletedShipments = db.prepare('DELETE FROM shipments').run()
        deletedCounts.shipments = deletedShipments.changes
        logger.info(`[TEMİZLEME] ${deletedShipments.changes} sevkiyat silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] shipments silinirken hata: ${e.message}`)
      }
      
      // 3. Product Serial Numbers (Ürün Barkodları)
      try {
        const deletedSerialNumbers = db.prepare('DELETE FROM product_serial_numbers').run()
        deletedCounts.product_serial_numbers = deletedSerialNumbers.changes
        logger.info(`[TEMİZLEME] ${deletedSerialNumbers.changes} ürün barkodu silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] product_serial_numbers silinirken hata: ${e.message}`)
      }
      
      // 4. Production Actual Consumption (Fiili Harcanan Malzemeler)
      try {
        const deletedActualConsumption = db.prepare('DELETE FROM production_actual_consumption').run()
        deletedCounts.production_actual_consumption = deletedActualConsumption.changes
        logger.info(`[TEMİZLEME] ${deletedActualConsumption.changes} fiili harcanan malzeme kaydı silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] production_actual_consumption silinirken hata: ${e.message}`)
      }
      
      // 5. Stock Movements (Stok Hareketleri) - Üretim ve sevkiyat ile ilgili olanlar
      try {
        // Üretim ve sevkiyat ile ilgili stok hareketlerini sil
        const deletedStockMovements = db.prepare(`
          DELETE FROM stock_movements 
          WHERE reference_type IN ('production', 'shipment', 'production_order')
             OR reference_type IS NULL
        `).run()
        deletedCounts.stock_movements = deletedStockMovements.changes
        logger.info(`[TEMİZLEME] ${deletedStockMovements.changes} stok hareketi silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] stock_movements silinirken hata: ${e.message}`)
      }
      
      // 6. Production Orders (Üretim Emirleri)
      try {
        const deletedProductionOrders = db.prepare('DELETE FROM production_orders').run()
        deletedCounts.production_orders = deletedProductionOrders.changes
        logger.info(`[TEMİZLEME] ${deletedProductionOrders.changes} üretim emri silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] production_orders silinirken hata: ${e.message}`)
      }
      
      // 7. Orders tablosundaki production_order_id referanslarını temizle
      try {
        const updatedOrders = db.prepare('UPDATE orders SET production_order_id = NULL').run()
        deletedCounts.orders_updated = updatedOrders.changes
        logger.info(`[TEMİZLEME] ${updatedOrders.changes} siparişteki üretim emri referansı temizlendi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] orders production_order_id temizlenirken hata: ${e.message}`)
      }
      
      return deletedCounts
    })()
    
    logger.info('[TEMİZLEME] Üretim emirleri, barkodlar ve sevkiyat verileri başarıyla silindi', result)
    
    const totalDeleted = Object.values(result).reduce((sum, count) => sum + (count || 0), 0)

    logAudit(db, {
      tableName: 'admin_operation',
      action: 'delete',
      recordId: 'clear-production-shipment-barcode',
      userId: user.userId,
      after: { ...result, total_deleted: totalDeleted },
    })
    
    return NextResponse.json({
      success: true,
      message: `Üretim emirleri, barkodlar ve sevkiyat verileri başarıyla silindi. Toplam ${totalDeleted} kayıt temizlendi.`,
      deleted_counts: result,
      total_deleted: totalDeleted
    })
  } catch (error: any) {
    logger.error('[TEMİZLEME] Hata oluştu', { error: error.message, stack: error.stack })
    return NextResponse.json(
      { error: 'Veri temizleme sırasında hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}, ['admin'])

