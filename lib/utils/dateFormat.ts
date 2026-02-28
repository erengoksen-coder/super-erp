/** Tarih/saat değerini Date'e çevirir; geçersizse null döner */
function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const d = new Date(value as string)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Sistemdeki tüm tarihler için standart format: gg.aa.yyyy (örn. 31.12.2025)
 */
export function formatDate(value: Date | string | null | undefined): string {
  const d = toDate(value)
  if (!d) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Tarih + saat: gg.aa.yyyy ss:dd (örn. 31.12.2025 14:30). Saat detayı korunur.
 */
export function formatDateTime(value: Date | string | null | undefined): string {
  const d = toDate(value)
  if (!d) return '-'
  const datePart = formatDate(d)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${datePart} ${hours}:${minutes}`
}

/**
 * Sipariş tarihini (SİP TRH) ekranda göstermek için güvenli formatlama.
 * Excel seri numarası (örn. 45992 = 31.12.2025) veya hatalı yıl (45992) ile gelen değerleri düzeltir.
 * Çıktı: gg.aa.yyyy ss:dd
 */
export function formatOrderDateDisplay(
  orderDate: string | null | undefined,
  fallback: string | null = null
): string {
  if (orderDate == null || String(orderDate).trim() === '') {
    return fallback ?? '-'
  }
  const dateStr = String(orderDate).trim()
  try {
    let date: Date | null = null

    // Sayı veya sayı string (Excel seri: 45992 = 31.12.2025)
    const num = /^\d+$/.test(dateStr) ? parseInt(dateStr, 10) : NaN
    if (!isNaN(num)) {
      if (num >= 1 && num <= 100000) {
        // Excel seri numarası (1899-12-30 + n gün)
        const excelEpoch = new Date(1899, 11, 30, 0, 0, 0)
        date = new Date(excelEpoch)
        date.setDate(date.getDate() + num)
      } else if (num >= 1e9 && num <= 2e9) {
        // Unix saniye
        date = new Date(num * 1000)
      } else if (num > 2e9 && num < 5e12) {
        // Unix milisaniye
        date = new Date(num)
      }
    }

    // ISO veya YYYY-MM-DD
    if (!date && dateStr.includes('-')) {
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        date = new Date(dateStr)
      } else {
        const parts = dateStr.split('-')
        if (parts.length >= 3 && parts[0].length <= 2) {
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
        } else {
          date = new Date(dateStr)
        }
      }
    }

    // DD.MM.YYYY veya DD/MM/YYYY (veya DD.MM.YYYY HH:mm) — yıl 45992 gibi Excel seri olabilir
    if (!date && (dateStr.includes('.') || dateStr.includes('/'))) {
      const parts = dateStr.split(/[./]/)
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const yearPart = parseInt(parts[2], 10) // "45992" veya "45992 03:00" → 45992
        if (yearPart >= 1900 && yearPart <= 2100) {
          date = new Date(yearPart, month, day)
        } else if (yearPart >= 1 && yearPart <= 100000) {
          // Yıl yerine Excel seri numarası gelmiş (örn. 45992 = 31.12.2025)
          const excelEpoch = new Date(1899, 11, 30, 0, 0, 0)
          date = new Date(excelEpoch)
          date.setDate(date.getDate() + yearPart)
        } else {
          date = new Date(yearPart, month, day)
        }
      } else {
        date = new Date(dateStr)
      }
    }

    if (!date) {
      date = new Date(dateStr)
    }

    if (isNaN(date.getTime())) {
      return fallback ?? dateStr
    }

    // Yıl makul değilse (Excel seri denemesi yapılmadıysa) tekrar dene
    const y = date.getFullYear()
    if (y < 1900 || y > 2100) {
      if (!isNaN(num) && num >= 1 && num <= 100000) {
        const excelEpoch = new Date(1899, 11, 30, 0, 0, 0)
        date = new Date(excelEpoch)
        date.setDate(date.getDate() + num)
      }
      if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
        return fallback ?? dateStr
      }
    }

    return formatDateTime(date)
  } catch {
    return fallback ?? dateStr
  }
}
