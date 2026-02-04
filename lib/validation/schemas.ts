import { z } from 'zod'

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid('Geçersiz ID formatı'),
  email: z.string().email('Geçersiz e-posta formatı'),
  username: z.string()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalı')
    .max(50, 'Kullanıcı adı en fazla 50 karakter olabilir')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Kullanıcı adı sadece harf, rakam, - ve _ içerebilir'),
  password: z.string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermeli'),
  phone: z.string()
    .regex(/^[+]?[\d\s()-]+$/, 'Geçersiz telefon numarası formatı')
    .min(10, 'Telefon numarası en az 10 karakter olmalı'),
  price: z.number()
    .min(0, 'Fiyat negatif olamaz')
    .max(999999999.99, 'Fiyat çok büyük'),
  quantity: z.number()
    .min(0, 'Miktar negatif olamaz')
    .max(999999, 'Miktar çok büyük'),
  date: z.string().datetime('Geçersiz tarih formatı'),
  status: z.enum(['active', 'inactive', 'pending', 'cancelled', 'completed']),
  role: z.enum(['admin', 'user', 'manager', 'viewer']),
}

// User validation schemas
export const userSchemas = {
  create: z.object({
    username: commonSchemas.username,
    password: commonSchemas.password,
    email: commonSchemas.email.optional(),
    full_name: z.string()
      .min(2, 'Ad soyad en az 2 karakter olmalı')
      .max(100, 'Ad soyad en fazla 100 karakter olabilir'),
    role: commonSchemas.role,
    job_title: z.string()
      .max(100, 'İş unvanı en fazla 100 karakter olabilir')
      .optional(),
  }),
  update: z.object({
    username: commonSchemas.username.optional(),
    email: commonSchemas.email.optional(),
    full_name: z.string()
      .min(2, 'Ad soyad en az 2 karakter olmalı')
      .max(100, 'Ad soyad en fazla 100 karakter olabilir')
      .optional(),
    role: commonSchemas.role.optional(),
    job_title: z.string()
      .max(100, 'İş unvanı en fazla 100 karakter olabilir')
      .optional(),
  }),
  login: z.object({
    username: z.string().min(1, 'Kullanıcı adı gerekli'),
    password: z.string().min(1, 'Şifre gerekli'),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Mevcut şifre gerekli'),
    newPassword: commonSchemas.password,
  }),
}

// Material validation schemas
export const materialSchemas = {
  create: z.object({
    code: z.string()
      .min(2, 'Malzeme kodu en az 2 karakter olmalı')
      .max(50, 'Malzeme kodu en fazla 50 karakter olabilir'),
    name: z.string()
      .min(2, 'Malzeme adı en az 2 karakter olmalı')
      .max(200, 'Malzeme adı en fazla 200 karakter olabilir'),
    description: z.string()
      .max(1000, 'Açıklama en fazla 1000 karakter olabilir')
      .optional(),
    category: z.string()
      .min(1, 'Kategori gerekli')
      .max(100, 'Kategori en fazla 100 karakter olabilir'),
    unit: z.string()
      .min(1, 'Birim gerekli')
      .max(50, 'Birim en fazla 50 karakter olabilir'),
    unit_cost: commonSchemas.price,
    min_stock: commonSchemas.quantity.optional(),
    max_stock: commonSchemas.quantity.optional(),
  }),
  update: z.object({
    code: z.string()
      .min(2, 'Malzeme kodu en az 2 karakter olmalı')
      .max(50, 'Malzeme kodu en fazla 50 karakter olabilir')
      .optional(),
    name: z.string()
      .min(2, 'Malzeme adı en az 2 karakter olmalı')
      .max(200, 'Malzeme adı en fazla 200 karakter olabilir')
      .optional(),
    description: z.string()
      .max(1000, 'Açıklama en fazla 1000 karakter olabilir')
      .optional(),
    category: z.string()
      .min(1, 'Kategori gerekli')
      .max(100, 'Kategori en fazla 100 karakter olabilir')
      .optional(),
    unit: z.string()
      .min(1, 'Birim gerekli')
      .max(50, 'Birim en fazla 50 karakter olabilir')
      .optional(),
    unit_cost: commonSchemas.price.optional(),
    min_stock: commonSchemas.quantity.optional(),
    max_stock: commonSchemas.quantity.optional(),
  }),
}

// Product validation schemas
export const productSchemas = {
  create: z.object({
    sku: z.string()
      .min(2, 'SKU en az 2 karakter olmalı')
      .max(50, 'SKU en fazla 50 karakter olabilir'),
    name: z.string()
      .min(2, 'Ürün adı en az 2 karakter olmalı')
      .max(200, 'Ürün adı en fazla 200 karakter olabilir'),
    description: z.string()
      .max(2000, 'Açıklama en fazla 2000 karakter olabilir')
      .optional(),
    category: z.string()
      .min(1, 'Kategori gerekli')
      .max(100, 'Kategori en fazla 100 karakter olabilir'),
    unit: z.string()
      .min(1, 'Birim gerekli')
      .max(50, 'Birim en fazla 50 karakter olabilir'),
    unit_cost: commonSchemas.price,
    selling_price: commonSchemas.price.optional(),
  }),
  update: z.object({
    sku: z.string()
      .min(2, 'SKU en az 2 karakter olmalı')
      .max(50, 'SKU en fazla 50 karakter olabilir')
      .optional(),
    name: z.string()
      .min(2, 'Ürün adı en az 2 karakter olmalı')
      .max(200, 'Ürün adı en fazla 200 karakter olabilir')
      .optional(),
    description: z.string()
      .max(2000, 'Açıklama en fazla 2000 karakter olabilir')
      .optional(),
    category: z.string()
      .min(1, 'Kategori gerekli')
      .max(100, 'Kategori en fazla 100 karakter olabilir')
      .optional(),
    unit: z.string()
      .min(1, 'Birim gerekli')
      .max(50, 'Birim en fazla 50 karakter olabilir')
      .optional(),
    unit_cost: commonSchemas.price.optional(),
    selling_price: commonSchemas.price.optional(),
  }),
}

// Order validation schemas
export const orderSchemas = {
  create: z.object({
    customer_id: commonSchemas.id,
    order_date: commonSchemas.date,
    delivery_date: commonSchemas.date.optional(),
    items: z.array(z.object({
      product_id: commonSchemas.id,
      quantity: commonSchemas.quantity,
      unit_price: commonSchemas.price,
    })).min(1, 'En az bir ürün gerekli'),
    notes: z.string()
      .max(2000, 'Notlar en fazla 2000 karakter olabilir')
      .optional(),
  }),
  update: z.object({
    customer_id: commonSchemas.id.optional(),
    order_date: commonSchemas.date.optional(),
    delivery_date: commonSchemas.date.optional(),
    items: z.array(z.object({
      product_id: commonSchemas.id,
      quantity: commonSchemas.quantity,
      unit_price: commonSchemas.price,
    })).optional(),
    notes: z.string()
      .max(2000, 'Notlar en fazla 2000 karakter olabilir')
      .optional(),
    status: commonSchemas.status.optional(),
  }),
}

// Production validation schemas
export const productionSchemas = {
  create: z.object({
    order_id: commonSchemas.id,
    product_id: commonSchemas.id,
    quantity: commonSchemas.quantity,
    planned_start_date: commonSchemas.date,
    planned_end_date: commonSchemas.date.optional(),
    notes: z.string()
      .max(2000, 'Notlar en fazla 2000 karakter olabilir')
      .optional(),
  }),
  update: z.object({
    quantity: commonSchemas.quantity.optional(),
    planned_start_date: commonSchemas.date.optional(),
    planned_end_date: commonSchemas.date.optional(),
    actual_start_date: commonSchemas.date.optional(),
    actual_end_date: commonSchemas.date.optional(),
    status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).optional(),
    notes: z.string()
      .max(2000, 'Notlar en fazla 2000 karakter olabilir')
      .optional(),
  }),
}

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    // Schema kontrolü
    if (!schema || typeof schema !== 'object' || !('safeParse' in schema) || typeof schema.safeParse !== 'function') {
      return { success: false, error: 'Geçersiz validation şeması' }
    }

    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      // Güvenli error mesajı çıkarma
      const error = result.error
      let message = 'Geçersiz istek verisi'
      if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues) && error.issues.length > 0) {
        const firstIssue = error.issues[0]
        if (firstIssue && typeof firstIssue === 'object' && 'message' in firstIssue && typeof firstIssue.message === 'string') {
          message = firstIssue.message
        }
      }
      return { success: false, error: message }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Doğrulama hatası oluştu'
    return { success: false, error: errorMessage }
  }
}

// API endpoint validation decorator
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (request: Request, data: T, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any) => {
    try {
      // Schema kontrolü
      if (!schema || typeof schema !== 'object' || !('safeParse' in schema) || typeof schema.safeParse !== 'function') {
        return Response.json(
          { error: 'Geçersiz validation şeması' },
          { status: 500 }
        )
      }

      let data: unknown
      try {
        data = await request.json()
      } catch {
        return Response.json(
          { error: 'Geçersiz JSON formatı' },
          { status: 400 }
        )
      }

      const validation = validateRequest(schema, data)
      
      if (!validation.success) {
        return Response.json(
          { error: validation.error },
          { status: 400 }
        )
      }
      
      return handler(request, validation.data, context)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Geçersiz JSON formatı'
      return Response.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
  }
}