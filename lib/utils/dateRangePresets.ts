/**
 * Raporlarda kullanılan standart tarih aralığı seçenekleri.
 */

export type DateRangePreset = 'week' | 'last30' | 'month' | 'year' | 'custom'

export function getPresetDates(preset: DateRangePreset): { from: string; to: string } {
  const to = new Date()
  const toStr = to.toISOString().split('T')[0]
  const from = new Date()

  if (preset === 'week') {
    from.setDate(from.getDate() - 7)
  } else if (preset === 'last30') {
    from.setDate(from.getDate() - 30)
  } else if (preset === 'month') {
    from.setMonth(from.getMonth() - 1)
  } else if (preset === 'year') {
    from.setFullYear(from.getFullYear() - 1)
  } else {
    from.setMonth(from.getMonth() - 1)
  }
  const fromStr = from.toISOString().split('T')[0]
  return { from: fromStr, to: toStr }
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  week: 'Son 7 gün',
  last30: 'Son 30 gün',
  month: 'Bu ay',
  year: 'Bu yıl',
  custom: 'Özel',
}
