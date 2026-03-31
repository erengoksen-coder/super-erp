import { z } from 'zod'

/**
 * Malzeme kartı oluşturma ve güncelleme şeması
 */
export const materialSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'Malzeme kodu zorunludur').max(20).optional(),
  name: z.string().min(2, 'Malzeme adı en az 2 karakter olmalıdır').max(100),
  category: z.string().max(50).nullable().optional(),
  unit: z.string().min(1, 'Birim zorunludur').max(10),
  min_stock_level: z.number().min(0, 'Minimum stok 0 veya daha büyük olmalıdır').default(0),
  unit_price: z.number().min(0, 'Birim fiyat 0 veya daha büyük olmalıdır').default(0),
  stock_amount: z.number().optional(), // Sadece başlangıç stoku için
})

/**
 * Stok hareketi (Giriş/Çıkış) şeması
 */
export const stockMovementSchema = z.object({
  material_id: z.string().uuid('Geçersiz malzeme ID'),
  quantity: z.number().gt(0, 'Miktar 0\'dan büyük olmalıdır'),
  movement_type: z.enum(['in', 'out']),
  reference_type: z.string().nullable().optional(),
  reference_id: z.string().nullable().optional(),
  invoice_number: z.string().max(50).nullable().optional(),
  shipment_number: z.string().max(50).nullable().optional(),
  notes: z.string().max(255).nullable().optional(),
})

export type MaterialInput = z.infer<typeof materialSchema>
export type StockMovementInput = z.infer<typeof stockMovementSchema>
