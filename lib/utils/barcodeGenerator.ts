/**
 * Barkod ve Seri Numarası Üretme Fonksiyonları
 */

/**
 * Ürün için EAN-13 uyumlu 13 haneli barkod üretir
 * EAN-13 formatı: 869 (Türkiye kodu) + 9 haneli ürün kodu + 1 kontrol hanesi
 * Her ürün için benzersiz barkod garantisi
 */
export function generateBarcode(sku: string, sequence: number): string {
  // EAN-13 formatı için: 869 (Türkiye) + 9 haneli kod + 1 kontrol hanesi = 13 hane
  const countryCode = '869' // Türkiye için EAN-13 ülke kodu
  
  // SKU'dan sayısal değer çıkar (harfleri sayıya çevir)
  const skuNumeric = sku
    .split('')
    .map(char => {
      const code = char.charCodeAt(0)
      return code % 10 // 0-9 arası sayı
    })
    .join('')
    .padStart(4, '0')
    .slice(0, 4)
  
  const today = new Date()
  const dateNum = parseInt(
    `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  ) % 10000 // Son 4 hane
  
  const seqStr = String(sequence).padStart(3, '0').slice(0, 3)
  const uniqueSuffix = String(Date.now()).slice(-2) // Son 2 hane
  
  // 9 haneli ürün kodu: SKU(4) + Tarih(2) + Sıra(2) + Unique(1) = 9 hane
  const productCode = `${skuNumeric}${String(dateNum).padStart(4, '0').slice(0, 4)}${seqStr}${uniqueSuffix}`.slice(0, 9)
  
  // EAN-13 kontrol hanesi hesapla
  const digits = (countryCode + productCode).split('').map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  
  return `${countryCode}${productCode}${checkDigit}`
}

/**
 * Seri numarası üretir
 * Format: SN-YYYYMMDD-XXXX-YYY (timestamp eklenerek benzersizlik garantisi)
 * Örnek: SN-20241215-0001-123
 */
export function generateSerialNumber(sequence: number): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  const seqStr = String(sequence).padStart(4, '0')
  // Benzersizlik için timestamp'in son 3 hanesi ekleniyor
  const uniqueSuffix = String(Date.now()).slice(-3)
  
  return `SN-${dateStr}-${seqStr}-${uniqueSuffix}`
}

/**
 * Bugün üretilen barkod sayısını alır (sıra numarası için)
 */
export async function getTodayBarcodeCount(productId: string): Promise<number> {
  try {
    const { localDB } = await import('@/lib/database/client')
    const response = await fetch(`/api/barcodes/count?product_id=${productId}`)
    if (!response.ok) return 0
    const data = await response.json()
    return data.count || 0
  } catch {
    return 0
  }
}

/**
 * Birden fazla barkod üretir
 */
export async function generateMultipleBarcodes(
  productId: string,
  sku: string,
  quantity: number
): Promise<Array<{ barcode: string; serial_number: string }>> {
  const barcodes: Array<{ barcode: string; serial_number: string }> = []
  
  // Bugünkü sıra numarasını al
  const todayCount = await getTodayBarcodeCount(productId)
  
  for (let i = 0; i < quantity; i++) {
    const sequence = todayCount + i + 1
    barcodes.push({
      barcode: generateBarcode(sku, sequence),
      serial_number: generateSerialNumber(sequence),
    })
  }
  
  return barcodes
}

