/**
 * Barkod / Mamül durumları - tüm ekranlarda aynı tanım (Barkod listesi, Genel Durum, Usta Terminali).
 * API'lerde Mamül Depo sayımı: status IN ('available', 'in_stock') ve sevk edilmemiş.
 */

/** Depoda (Mamül Depo) sayılacak status değerleri - tablo ve özet kartları aynı mantık */
export const DEPODA_STATUSES = ['in_stock', 'available'] as const

export function isDepodaStatus(status: string | null | undefined): boolean {
  return status != null && DEPODA_STATUSES.includes(status as typeof DEPODA_STATUSES[number])
}
