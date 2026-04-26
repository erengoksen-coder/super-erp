import { describe, it, expect, vi, Mock } from 'vitest'
import { checkBOMAvailability } from '@/lib/utils/bomLogic'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('bomLogic', () => {
  describe('checkBOMAvailability', () => {
    it('returns canProduce true and empty insufficientItems when Supabase client is null (demo mode)', async () => {
      ;(createClient as Mock).mockReturnValue(null)
      const result = await checkBOMAvailability('product-1', 1)
      expect(result.canProduce).toBe(true)
      expect(result.insufficientItems).toEqual([])
    })

    it('returns canProduce false and "Reçete bulunamadı" when BOM data is empty', async () => {
      ;(createClient as Mock).mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      })
      const result = await checkBOMAvailability('product-1', 1)
      expect(result.canProduce).toBe(false)
      expect(result.insufficientItems).toHaveLength(1)
      expect(result.insufficientItems[0].stock_name).toBe('Reçete bulunamadı')
    })
  })
})
