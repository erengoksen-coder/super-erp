import { z } from 'zod'

/**
 * Reçete (BOM) Kalemi Şeması
 */
export const bomItemSchema = z.object({
  material_id: z.string().uuid('Geçersiz malzeme ID'),
  quantity: z.number().gt(0, 'Miktar 0\'dan büyük olmalıdır'),
  wastage_percentage: z.number().min(0).max(100).default(0),
  notes: z.string().max(255).nullable().optional(),
})

/**
 * Reçete (BOM) Ana Şeması
 */
export const bomSchema = z.object({
  id: z.string().uuid().optional(),
  product_name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır'),
  product_code: z.string().min(1, 'Ürün kodu zorunludur').max(50),
  description: z.string().max(500).nullable().optional(),
  items: z.array(bomItemSchema).min(1, 'Reçete en az bir hammadde içermelidir'),
  version: z.number().int().default(1),
  is_active: z.boolean().default(true),
})

/**
 * Üretim Emri Şeması
 */
export const productionOrderSchema = z.object({
  id: z.string().uuid().optional(),
  bom_id: z.string().uuid('Geçersiz reçete ID'),
  quantity: z.number().gt(0, 'Üretim miktarı 0\'dan büyük olmalıdır'),
  planned_start_date: z.string().optional(),
  planned_end_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  notes: z.string().max(500).nullable().optional(),
})

/**
 * İş Emri (Work Order) Durum Güncelleme
 */
export const workOrderUpdateSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'paused', 'completed', 'cancelled']),
  actual_quantity: z.number().min(0).optional(),
  scrap_quantity: z.number().min(0).optional(),
  operator_id: z.string().uuid().optional(),
  notes: z.string().max(255).nullable().optional(),
})

export type BOMInput = z.infer<typeof bomSchema>
export type BOMItemInput = z.infer<typeof bomItemSchema>
export type ProductionOrderInput = z.infer<typeof productionOrderSchema>
export type WorkOrderUpdateInput = z.infer<typeof workOrderUpdateSchema>
