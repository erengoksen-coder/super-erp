import { describe, it, expect } from 'vitest'
import { getPresetDates, DATE_RANGE_PRESET_LABELS } from '@/lib/utils/dateRangePresets'

describe('dateRangePresets', () => {
  describe('getPresetDates', () => {
    it('returns from and to as YYYY-MM-DD', () => {
      const result = getPresetDates('today')
      expect(result).toHaveProperty('from')
      expect(result).toHaveProperty('to')
      expect(result.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('today: from equals to', () => {
      const result = getPresetDates('today')
      expect(result.from).toBe(result.to)
    })

    it('week: from is 7 days before to', () => {
      const result = getPresetDates('week')
      const from = new Date(result.from)
      const to = new Date(result.to)
      const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
      expect(diffDays).toBe(7)
    })

    it('last30: from is 30 days before to', () => {
      const result = getPresetDates('last30')
      const from = new Date(result.from)
      const to = new Date(result.to)
      const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
      expect(diffDays).toBe(30)
    })

    it('month: from is first day of current month', () => {
      const result = getPresetDates('month')
      const from = new Date(result.from)
      expect(from.getDate()).toBe(1)
    })

    it('year: from is first day of January', () => {
      const result = getPresetDates('year')
      const from = new Date(result.from)
      expect(from.getMonth()).toBe(0)
      expect(from.getDate()).toBe(1)
    })

    it('custom falls back to last30-like range', () => {
      const result = getPresetDates('custom')
      expect(result.from).toBeDefined()
      expect(result.to).toBeDefined()
    })
  })

  describe('DATE_RANGE_PRESET_LABELS', () => {
    it('has label for every preset', () => {
      const presets = ['today', 'week', 'last30', 'month', 'year', 'custom'] as const
      presets.forEach((p) => {
        expect(DATE_RANGE_PRESET_LABELS[p]).toBeDefined()
        expect(typeof DATE_RANGE_PRESET_LABELS[p]).toBe('string')
      })
    })
  })
})
