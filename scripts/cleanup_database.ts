import { getDatabase } from '../lib/database/db'
import fs from 'fs'
import path from 'path'

/**
 * Super ERP - Veritabanı Temizleme Betiği
 * Bu script, sistemi gerçek kullanıma hazırlamak için tüm test verilerini siler.
 * DİKKAT: Bu işlem geri döndürülemez!
 */

async function cleanup() {
  console.log('--- Super ERP Veritabanı Temizliği Başlatılıyor ---')
  
  try {
    const db = getDatabase()
    
    // Temizlenecek tablolar (Loglar, Siparişler, Stoklar, Fiyatlar, Reçeteler, Finans)
    const tables = [
      'audit_logs',
      'orders',
      'production_orders',
      'production_costs',
      'production_actual_consumption',
      'production_movements',
      'product_serial_numbers',
      'shipments',
      'shipment_items',
      'stock_movements',
      'material_stocks',
      'material_prices',
      'purchase_requests',
      'purchase_orders',
      'purchase_order_items',
      'account_transactions',
      'journal_entries',
      'payments',
      'bom',
      'bom_versions',
      'materials',
      'products',
      'accounts',
      'webhooks'
    ]

    console.log(`${tables.length} tablo temizleniyor...`)

    db.transaction(() => {
      for (const table of tables) {
        try {
          db.prepare(`DELETE FROM ${table}`).run()
          console.log(`[OK] ${table} temizlendi.`)
        } catch (e: any) {
          console.warn(`[UYARI] ${table} temizlenemedi (belki tablo yok):`, e.message)
        }
      }
    })()

    console.log('--------------------------------------------------')
    console.log('Sistem başarıyla temizlendi ve gerçek kullanıma hazır!')
    console.log('Not: Şirket ayarları ve şube bilgileri korundu.')
    
  } catch (error: any) {
    console.error('Kritik Hata:', error.message)
  }
}

// Dosya doğrudan çalıştırılıyorsa temizliği başlat
if (require.main === module) {
  cleanup()
}

export { cleanup }
