/**
 * Sipariş ve fatura numarası önekleri (tek kaynak — env ile yapılandırılabilir).
 * Sıra numarası üretimi: lib/utils/codeGenerator.ts (generateNextCode).
 * Tüm ekranlarda numara, API’den gelen değer (invoice_number, order_number) kullanılarak gösterilmelidir.
 *
 * .env örnekleri:
 *   ORDER_NUMBER_PREFIX=SIP     (sipariş no: SIP-...)
 *   INVOICE_PREFIX_SALE=SAT     (satış fatura: SAT-2025-001)
 *   INVOICE_PREFIX_PURCHASE=ALI (alış fatura: ALI-2025-001)
 */

export function getOrderNumberPrefix(): string {
  const v = process.env.ORDER_NUMBER_PREFIX
  return (v && v.trim()) || 'SIP'
}

export function getInvoicePrefixSale(): string {
  const v = process.env.INVOICE_PREFIX_SALE
  return (v && v.trim()) || 'SAT'
}

export function getInvoicePrefixPurchase(): string {
  const v = process.env.INVOICE_PREFIX_PURCHASE
  return (v && v.trim()) || 'ALI'
}

/** Tutar formatlama (Para birimi) */
export function formatCurrency(value: number | string, currency: string = 'TRY'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0,00 ₺'
  
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

