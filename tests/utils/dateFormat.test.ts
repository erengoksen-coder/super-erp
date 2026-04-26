import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatOrderDateDisplay } from '@/lib/utils/dateFormat'

describe('dateFormat', () => {
  describe('formatDate', () => {
    it('formats ISO date as dd.mm.yyyy', () => {
      expect(formatDate('2025-12-31')).toBe('31.12.2025')
      expect(formatDate('2024-01-05')).toBe('05.01.2024')
    })

    it('returns "-" for null, undefined, empty', () => {
      expect(formatDate(null)).toBe('-')
      expect(formatDate(undefined)).toBe('-')
      expect(formatDate('')).toBe('-')
    })

    it('handles Date object', () => {
      expect(formatDate(new Date(2025, 11, 31))).toBe('31.12.2025')
    })

    it('returns "-" for invalid date string', () => {
      expect(formatDate('invalid')).toBe('-')
    })
  })

  describe('formatDateTime', () => {
    it('formats with date and time', () => {
      const d = new Date(2025, 11, 31, 14, 30)
      expect(formatDateTime(d)).toBe('31.12.2025 14:30')
    })

    it('returns "-" for null', () => {
      expect(formatDateTime(null)).toBe('-')
    })
  })

  describe('formatOrderDateDisplay', () => {
    it('returns fallback or "-" when orderDate is null/empty', () => {
      expect(formatOrderDateDisplay(null, null)).toBe('-')
      expect(formatOrderDateDisplay('', null)).toBe('-')
      expect(formatOrderDateDisplay(null, '2025-01-01')).toBe('2025-01-01')
    })

    it('parses ISO date string', () => {
      const result = formatOrderDateDisplay('2025-12-31')
      expect(result).toMatch(/31\.12\.2025/)
    })

    it('parses Excel serial number (e.g. 45992 = 31.12.2025)', () => {
      const result = formatOrderDateDisplay('45992')
      expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/)
      expect(result).not.toBe('-')
    })

    it('parses DD.MM.YYYY style', () => {
      const result = formatOrderDateDisplay('31.12.2025')
      expect(result).toMatch(/31\.12\.2025/)
    })
  })
})
