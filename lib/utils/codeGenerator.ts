/**
 * Otomatik kod üretme yardımcı fonksiyonları
 * Local database için güncellendi
 */

export interface CodeGeneratorOptions {
  prefix: string
  padding?: number
  startNumber?: number
}

/**
 * Yeni kod üretir
 */
export function generateNextCode(
  lastCode: string | null,
  options: CodeGeneratorOptions
): string {
  const { prefix, padding = 3, startNumber = 1 } = options

  if (!lastCode) {
    return `${prefix}-${String(startNumber).padStart(padding, '0')}`
  }

  const parts = lastCode.split('-')
  if (parts.length < 2) {
    return `${prefix}-${String(startNumber).padStart(padding, '0')}`
  }

  const lastNumber = parseInt(parts[parts.length - 1], 10)
  if (isNaN(lastNumber)) {
    return `${prefix}-${String(startNumber).padStart(padding, '0')}`
  }

  const nextNumber = lastNumber + 1
  return `${prefix}-${String(nextNumber).padStart(padding, '0')}`
}

/**
 * Ürün kodu üretir (Local database)
 */
export async function generateProductCode(): Promise<string> {
  try {
    const { localDB } = await import('@/lib/database/client')
    const products = await localDB.getProducts()
    
    if ((products as any).length === 0) {
      return generateNextCode(null, { prefix: 'KOL', padding: 3 })
    }

    // SKU'ları sırala ve son kodu al
    const sorted = (products as any)
      .map((p: any) => p.sku)
      .filter((sku: string) => sku.startsWith('KOL-'))
      .sort()
      .reverse()

    if (sorted.length === 0) {
      return generateNextCode(null, { prefix: 'KOL', padding: 3 })
    }

    return generateNextCode(sorted[0], { prefix: 'KOL', padding: 3 })
  } catch {
    return generateNextCode(null, { prefix: 'KOL', padding: 3 })
  }
}

/**
 * Stok kartı kodu üretir
 */
export async function generateInventoryCode(): Promise<string> {
  try {
    const { localDB } = await import('@/lib/database/client')
    const materials = await localDB.getMaterials()
    
    if ((materials as any).length === 0) {
      return generateNextCode(null, { prefix: 'STK', padding: 3 })
    }

    // İsimlerden kod çıkar (eğer varsa) veya sıralı numara
    return generateNextCode(null, { prefix: 'STK', padding: 3 })
  } catch {
    return generateNextCode(null, { prefix: 'STK', padding: 3 })
  }
}

/**
 * Malzeme kodu üretir
 */
export async function generateMaterialCode(): Promise<string> {
  try {
    const { localDB } = await import('@/lib/database/client')
    const materials = await localDB.getMaterials()
    
    if ((materials as any).length === 0) {
      return generateNextCode(null, { prefix: 'MAL', padding: 3 })
    }

    // Kodları sırala ve son kodu al
    const sorted = (materials as any)
      .map((m: any) => m.code)
      .filter((code: string) => code && code.startsWith('MAL-'))
      .sort()
      .reverse()

    if (sorted.length === 0) {
      return generateNextCode(null, { prefix: 'MAL', padding: 3 })
    }

    return generateNextCode(sorted[0], { prefix: 'MAL', padding: 3 })
  } catch {
    return generateNextCode(null, { prefix: 'MAL', padding: 3 })
  }
}

/**
 * Üretim emri numarası üretir
 */
export async function generateProductionOrderNumber(): Promise<string> {
  try {
    const response = await fetch('/api/production')
    if (!response.ok) {
      return generateNextCode(null, { prefix: 'URE', padding: 3 })
    }
    
    const orders = await response.json()
    
    if (orders.length === 0) {
      return generateNextCode(null, { prefix: 'URE', padding: 3 })
    }

    const sorted = orders
      .map((o: any) => o.order_number)
      .filter((num: string) => num && num.startsWith('URE-'))
      .sort()
      .reverse()

    if (sorted.length === 0) {
      return generateNextCode(null, { prefix: 'URE', padding: 3 })
    }

    return generateNextCode(sorted[0], { prefix: 'URE', padding: 3 })
  } catch {
    return generateNextCode(null, { prefix: 'URE', padding: 3 })
  }
}

/**
 * Cari hesap kodu üretir
 */
export async function generateAccountCode(
  accountType: 'customer' | 'supplier' = 'customer'
): Promise<string> {
  const prefix = accountType === 'customer' ? 'MUS' : 'TED'
  return generateNextCode(null, { prefix, padding: 3 })
}

/**
 * Fatura numarası üretir (veritabanındaki son numaraya göre sıradakini döner)
 */
export async function generateInvoiceNumber(
  invoiceType: 'sale' | 'purchase' = 'sale'
): Promise<string> {
  const prefix = invoiceType === 'sale' ? 'SAT' : 'ALI'
  const year = new Date().getFullYear()
  const fallback = `${prefix}-${year}-001`
  try {
    const { fetchApi } = await import('@/lib/api/fetch')
    const data = await fetchApi<{ nextNumber: string }>(
      `/api/invoices/next-number?type=${encodeURIComponent(invoiceType)}`
    )
    if (data?.nextNumber && typeof data.nextNumber === 'string') {
      return data.nextNumber
    }
  } catch {
    // API yoksa veya hata varsa yalnızca önizleme için yıl-001 kullan
  }
  return fallback
}

// generateShipmentNumber moved to codeGenerator.server.ts
// This file is client-safe and doesn't import server-side modules
