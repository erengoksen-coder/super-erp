import { describe, it, expect, vi } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { ok, fail } from '@/lib/api/response'

describe('API response helpers', () => {
  describe('ok', () => {
    it('returns 200 with success and data', async () => {
      const res = ok({ id: '1', name: 'test' })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toEqual({ id: '1', name: 'test' })
      expect(body.error).toBeUndefined()
    })

    it('includes optional message', async () => {
      const res = ok({ count: 5 }, { message: 'Başarılı' })
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.message).toBe('Başarılı')
    })

    it('includes optional meta', async () => {
      const res = ok([], { meta: { total: 100, limit: 50, offset: 0 } })
      const body = await res.json()
      expect(body.meta).toEqual({ total: 100, limit: 50, offset: 0 })
    })

    it('allows custom status', () => {
      const res = ok({ created: true }, { status: 201 })
      expect(res.status).toBe(201)
    })
  })

  describe('fail', () => {
    it('returns 500 by default with error message', async () => {
      const res = fail('Sunucu hatası')
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Sunucu hatası')
      expect(body.data).toBeUndefined()
    })

    it('allows custom status', async () => {
      const res = fail('Bulunamadı', { status: 404 })
      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Bulunamadı')
    })

    it('includes optional details', async () => {
      const res = fail('Doğrulama hatası', { status: 400, details: { field: 'email' } })
      const body = await res.json()
      expect(body.details).toEqual({ field: 'email' })
    })
  })
})
