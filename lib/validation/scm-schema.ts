import { z } from 'zod'

/**
 * Cari Hesap (Müşteri/Tedarikçi) Şeması
 */
export const accountSchema = z.object({
  code: z.string().min(3, 'Cari kodu en az 3 karakter olmalıdır'),
  name: z.string().min(2, 'Cari adı en az 2 karakter olmalıdır'),
  type: z.enum(['customer', 'vendor', 'both']),
  tax_number: z.string().optional().nullable(),
  email: z.string().email('Geçersiz e-posta adresi').or(z.literal('')).optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  risk_limit: z.coerce.number().min(0).default(0),
  discount_rate: z.coerce.number().min(0).max(100).default(0),
  authorized_person_name: z.string().optional().nullable(),
  authorized_person_phone: z.string().optional().nullable()
})

/**
 * Sipariş Kalemi Şeması
 */
const orderItemSchema = z.object({
  product_id: z.string().min(1, 'Ürün seçiniz'),
  quantity: z.coerce.number().positive('Miktar pozitif olmalıdır'),
  unit_price: z.coerce.number().nonnegative('Birim fiyat negatif olamaz'),
  notes: z.string().optional().nullable()
})

/**
 * Satış / Satınalma Siparişi Şeması
 */
export const orderSchema = z.object({
  account_id: z.string().min(1, 'Cari hesap seçiniz'),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih formatı (YYYY-MM-DD)'),
  status: z.enum(['pending', 'approved', 'in_production', 'completed', 'cancelled']).default('pending'),
  payment_terms_days: z.coerce.number().int().min(0).default(0),
  items: z.array(orderItemSchema).min(1, 'En az bir kalem eklenmelidir'),
  notes: z.string().optional().nullable()
})

/**
 * Fatura Şeması
 */
export const invoiceSchema = z.object({
  account_id: z.string().uuid(),
  invoice_number: z.string().min(3),
  invoice_date: z.string(),
  type: z.enum(['sale', 'purchase']),
  items: z.array(orderItemSchema),
  tax_rate: z.number().min(0).max(100).default(20),
  discount_rate: z.number().min(0).max(100).default(0),
  notes: z.string().optional().nullable()
})

export type AccountInput = z.infer<typeof accountSchema>
export type OrderInput = z.infer<typeof orderSchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>
