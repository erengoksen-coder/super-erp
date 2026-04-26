#!/usr/bin/env node
/**
 * Stok Durumu ekranındaki "düşük stok" uyarısını kaldırır:
 * Tüm ürün ve malzemelerin min_stock_level = 0 yapılır.
 * Stok miktarları değiştirilmez; sadece uyarı eşiği sıfırlanır.
 *
 * Çalıştırma: node scripts/reset-stock-levels-display.js
 */

const { assertDbExists, openDatabase } = require('./db-utils')
const db = openDatabase()

console.log('Stok Durumu: min_stock_level sıfırlanıyor...')

const r1 = db.prepare('UPDATE products SET min_stock_level = 0').run()
const r2 = db.prepare('UPDATE materials SET min_stock_level = 0').run()
console.log('  Ürünler:', r1.changes)
console.log('  Malzemeler:', r2.changes)
db.close()
console.log('Bitti. Stok Durumu sayfasını yenileyin.')
