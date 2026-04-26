import { describe, it, expect, vi, beforeEach } from 'vitest'
import { productionService } from '@/lib/services/production-service'
import { getDatabase } from '@/lib/database/db'

// Mock the database
vi.mock('@/lib/database/db', () => ({
  getDatabase: vi.fn(),
  DEFAULT_COMPANY_ID: 'comp-1',
  DEFAULT_BRANCH_ID: 'branch-1'
}))

describe('ProductionService', () => {
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 1 }),
        all: vi.fn().mockReturnValue([]),
        get: vi.fn().mockReturnValue({ id: '1', status: 'pending' })
      }),
      transaction: vi.fn((cb) => cb)
    }
    ;(getDatabase as any).mockReturnValue(mockDb)
  })

  it('should exist', () => {
    expect(productionService).toBeDefined()
  })

  it('should create a production order successfully', async () => {
    const input = {
      bom_id: 'bom-123',
      quantity: 10
    }
    
    // Mock BOM items for calculation
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM bom')) {
        return {
          all: vi.fn().mockReturnValue([
            { material_id: 'mat-1', quantity_required: 2, waste_percentage: 10 }
          ])
        }
      }
      return {
        run: vi.fn().mockReturnValue({ changes: 1 }),
        get: vi.fn().mockReturnValue({ id: 'version-1' })
      }
    })

    const result = await productionService.createProductionOrder(input, 'c1', 'b1', 'u1')
    
    expect(result).toHaveProperty('orderNumber')
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO production_orders'))
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO stock_reservations'))
  })
})
