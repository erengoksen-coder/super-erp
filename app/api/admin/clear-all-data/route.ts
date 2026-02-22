import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { logger } from '@/lib/utils/logger'
import { logAudit } from '@/lib/audit'

// POST: BOM ve ayarlar hariç tüm verileri sil - Sadece admin
// Korunan: companies, branches, warehouses, users, roles, permissions, unit_conversions, label_settings,
//          operations, work_centers, bom, bom_versions, materials, products, chart_of_accounts, accounts (yapı)
// Silinen: ödeme kayıtları, fatura, cari hareketler, siparişler, üretim emirleri, stok hareketleri, sevkiyat, vb.
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
    
    logger.info('[TEMİZLEME] Tüm veri girişleri siliniyor (yapısal tablolar korunuyor)...')
    
    // Transaction içinde tüm silme işlemlerini yap
    const result = db.transaction(() => {
      let deletedCounts: Record<string, number> = {}
      
      // 1. Journal Entry Lines (Yevmiye Satırları) - Önce silinmeli (FOREIGN KEY)
      try {
        const deletedJournalLines = db.prepare('DELETE FROM journal_entry_lines').run()
        deletedCounts.journal_entry_lines = deletedJournalLines.changes
        logger.info(`[TEMİZLEME] ${deletedJournalLines.changes} yevmiye satırı silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] journal_entry_lines silinirken hata: ${e.message}`)
      }
      
      // 2. General Ledger (Defter-i Kebir)
      try {
        const deletedGeneralLedger = db.prepare('DELETE FROM general_ledger').run()
        deletedCounts.general_ledger = deletedGeneralLedger.changes
        logger.info(`[TEMİZLEME] ${deletedGeneralLedger.changes} defter-i kebir kaydı silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] general_ledger silinirken hata: ${e.message}`)
      }
      
      // 3. Journal Entries (Yevmiye Kayıtları)
      try {
        const deletedJournalEntries = db.prepare('DELETE FROM journal_entries').run()
        deletedCounts.journal_entries = deletedJournalEntries.changes
        logger.info(`[TEMİZLEME] ${deletedJournalEntries.changes} yevmiye kaydı silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] journal_entries silinirken hata: ${e.message}`)
      }

      // 3b. Cari hareketleri ve ödemeler (BOM/ayar değil, silinir)
      try {
        const deletedAccountTx = db.prepare('DELETE FROM account_transactions').run()
        deletedCounts.account_transactions = deletedAccountTx.changes
        logger.info(`[TEMİZLEME] ${deletedAccountTx.changes} cari hareket silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] account_transactions silinirken hata: ${e.message}`)
      }
      try {
        const deletedPayments = db.prepare('DELETE FROM payments').run()
        deletedCounts.payments = deletedPayments.changes
        logger.info(`[TEMİZLEME] ${deletedPayments.changes} ödeme kaydı silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] payments silinirken hata: ${e.message}`)
      }
      try {
        const deletedInvoiceItems = db.prepare('DELETE FROM invoice_items').run()
        deletedCounts.invoice_items = deletedInvoiceItems.changes
        logger.info(`[TEMİZLEME] ${deletedInvoiceItems.changes} fatura kalemi silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] invoice_items silinirken hata: ${e.message}`)
      }
      try {
        const deletedInvoices = db.prepare('DELETE FROM invoices').run()
        deletedCounts.invoices = deletedInvoices.changes
        logger.info(`[TEMİZLEME] ${deletedInvoices.changes} fatura silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] invoices silinirken hata: ${e.message}`)
      }
      
      // 4. Shipment Items (Sevkiyat Kalemleri) - Önce silinmeli (FOREIGN KEY)
      try {
        const deletedShipmentItems = db.prepare('DELETE FROM shipment_items').run()
        deletedCounts.shipment_items = deletedShipmentItems.changes
        logger.info(`[TEMİZLEME] ${deletedShipmentItems.changes} sevkiyat kalemi silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] shipment_items silinirken hata: ${e.message}`)
      }
      
      // 5. Shipments (Sevkiyatlar)
      try {
        const deletedShipments = db.prepare('DELETE FROM shipments').run()
        deletedCounts.shipments = deletedShipments.changes
        logger.info(`[TEMİZLEME] ${deletedShipments.changes} sevkiyat silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] shipments silinirken hata: ${e.message}`)
      }
      
      // 6. Product Serial Numbers (Ürün Barkodları)
      try {
        const deletedSerialNumbers = db.prepare('DELETE FROM product_serial_numbers').run()
        deletedCounts.product_serial_numbers = deletedSerialNumbers.changes
        logger.info(`[TEMİZLEME] ${deletedSerialNumbers.changes} ürün barkodu silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] product_serial_numbers silinirken hata: ${e.message}`)
      }
      
      // 7. Production Actual Consumption (Fiili Harcanan Malzemeler)
      try {
        const deletedActualConsumption = db.prepare('DELETE FROM production_actual_consumption').run()
        deletedCounts.production_actual_consumption = deletedActualConsumption.changes
        logger.info(`[TEMİZLEME] ${deletedActualConsumption.changes} fiili harcanan malzeme kaydı silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] production_actual_consumption silinirken hata: ${e.message}`)
      }
      
      // 8. Stock Movements (Stok Hareketleri)
      try {
        const deletedStockMovements = db.prepare('DELETE FROM stock_movements').run()
        deletedCounts.stock_movements = deletedStockMovements.changes
        logger.info(`[TEMİZLEME] ${deletedStockMovements.changes} stok hareketi silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] stock_movements silinirken hata: ${e.message}`)
      }

      // 8b. Üretim emri operasyonları ve iş emirleri (BOM değil)
      try {
        const deletedProdOp = db.prepare('DELETE FROM production_order_operations').run()
        deletedCounts.production_order_operations = deletedProdOp.changes
      } catch (e: any) {}
      try {
        const deletedWoOp = db.prepare('DELETE FROM work_order_operations').run()
        deletedCounts.work_order_operations = deletedWoOp.changes
      } catch (e: any) {}
      try {
        const deletedWo = db.prepare('DELETE FROM work_orders').run()
        deletedCounts.work_orders = deletedWo.changes
      } catch (e: any) {}
      
      // 9. Production Orders (Üretim Emirleri)
      try {
        const deletedProductionOrders = db.prepare('DELETE FROM production_orders').run()
        deletedCounts.production_orders = deletedProductionOrders.changes
        logger.info(`[TEMİZLEME] ${deletedProductionOrders.changes} üretim emri silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] production_orders silinirken hata: ${e.message}`)
      }
      
      // 10. Orders (Siparişler)
      try {
        const deletedOrders = db.prepare('DELETE FROM active_orders').run()
        deletedCounts.orders = deletedOrders.changes
        logger.info(`[TEMİZLEME] ${deletedOrders.changes} sipariş silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] orders silinirken hata: ${e.message}`)
      }
      
      // 11. Purchase Requests (Satın Alma Talepleri)
      try {
        const deletedPurchaseRequests = db.prepare('DELETE FROM purchase_requests').run()
        deletedCounts.purchase_requests = deletedPurchaseRequests.changes
        logger.info(`[TEMİZLEME] ${deletedPurchaseRequests.changes} satın alma talebi silindi`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] purchase_requests silinirken hata: ${e.message}`)
      }
      
      // 12. Stok miktarlarını sıfırla (products ve materials)
      try {
        const resetProductsStock = db.prepare('UPDATE products SET stock_amount = 0').run()
        deletedCounts.products_stock_reset = resetProductsStock.changes
        logger.info(`[TEMİZLEME] ${resetProductsStock.changes} ürün stoğu sıfırlandı`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] products stock reset hatası: ${e.message}`)
      }
      
      try {
        const resetMaterialsStock = db.prepare('UPDATE materials SET stock_amount = 0').run()
        deletedCounts.materials_stock_reset = resetMaterialsStock.changes
        logger.info(`[TEMİZLEME] ${resetMaterialsStock.changes} malzeme stoğu sıfırlandı`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] materials stock reset hatası: ${e.message}`)
      }
      
      // 13. Accounts bakiyelerini sıfırla (cari hesaplar korunur, sadece bakiyeler sıfırlanır)
      try {
        const resetAccountBalances = db.prepare('UPDATE accounts SET balance = 0').run()
        deletedCounts.accounts_balance_reset = resetAccountBalances.changes
        logger.info(`[TEMİZLEME] ${resetAccountBalances.changes} cari hesap bakiyesi sıfırlandı`)
      } catch (e: any) {
        logger.warn(`[TEMİZLEME] accounts balance reset hatası: ${e.message}`)
      }
      
      return deletedCounts
    })()
    
    logger.info('[TEMİZLEME] Tüm veri girişleri başarıyla silindi', result)
    
    const totalDeleted = Object.values(result).reduce((sum, count) => sum + (count || 0), 0)

    logAudit(db, {
      tableName: 'admin_operation',
      action: 'delete',
      recordId: 'clear-all-data',
      userId: user.userId,
      after: { ...result, total_deleted: totalDeleted },
    })
    
    return NextResponse.json({
      success: true,
      message: `BOM ve ayarlar korundu; diğer tüm veriler silindi. Toplam ${totalDeleted} kayıt temizlendi. (Ödeme kayıtları, faturalar, cari hareketler, siparişler, üretim emirleri, stok hareketleri, sevkiyatlar vb. silindi.)`,
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

