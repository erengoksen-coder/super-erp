import { z } from 'zod'

/** UTF-8 bayt uzunluğu (bcrypt 72 bayt sınırı için; OWASP). */
function byteLength(str: string): number {
  if (typeof Buffer !== 'undefined') return Buffer.byteLength(str, 'utf8')
  return new TextEncoder().encode(str).length
}

const PASSWORD_MAX_BYTES = 72

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
    .refine((s) => byteLength(s) <= PASSWORD_MAX_BYTES, `Şifre en fazla ${PASSWORD_MAX_BYTES} bayt olabilir (güvenlik sınırı)`)
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
  // Rol alanı; Türkçe eş anlamlıları İngilizce değere çevirir (kayıt/API uyumu)
  roleWithAliases: z.string()
    .transform((val) => {
      const v = (val || '').toString().trim().toLowerCase()
      // Türkçe/ASCII eşlemesi (yönetici, yonetici, Yönetici vb.)
      if (/y[oö]netici/.test(v) || v === 'manager') return 'manager'
      if (/g[oö]r[uü]nt[uü]leyici/.test(v) || v === 'viewer') return 'viewer'
      if (/kullan[iı]c[iı]/.test(v) || v === 'user') return 'user'
      if (v === 'admin') return 'admin'
      return v
    })
    .pipe(z.enum(['admin', 'user', 'manager', 'viewer'], {
      message: 'Geçersiz rol. Lütfen Kullanıcı, Yönetici, Görüntüleyici veya Admin seçin.',
    })),
}

// User validation schemas
export const userSchemas = {
  create: z.object({
    username: commonSchemas.username,
    password: commonSchemas.password,
    email: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : val),
      z.string().email('Geçersiz e-posta formatı').optional()
    ),
    full_name: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.string().min(2, 'Ad soyad en az 2 karakter olmalı').max(100, 'Ad soyad en fazla 100 karakter olabilir').optional()
    ),
    role: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? 'user' : val),
      commonSchemas.roleWithAliases
    ),
    job_title: z.string()
      .max(100, 'İş unvanı en fazla 100 karakter olabilir')
      .optional(),
  }),
  // Kayıt sayfası için: kullanıcı adı sadece uzunluk kontrolü (regex yok, Türkçe/boşluk kabul)
  register: z.object({
    username: z.string()
      .transform((s) => (s != null ? String(s).trim() : ''))
      .refine((s) => s.length >= 3, 'Kullanıcı adı en az 3 karakter olmalı')
      .refine((s) => s.length <= 50, 'Kullanıcı adı en fazla 50 karakter olabilir'),
    password: commonSchemas.password,
    email: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : val),
      z.string().email('Geçersiz e-posta formatı').optional()
    ),
    full_name: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.string().min(2, 'Ad soyad en az 2 karakter olmalı').max(100, 'Ad soyad en fazla 100 karakter olabilir').optional()
    ),
    // Rol: herhangi bir string kabul et; API tarafında normalize edilecek (enum hatası olmaz)
    role: z.union([z.string(), z.undefined(), z.null()]).optional().transform((v) => (v == null || v === '' ? 'user' : String(v).trim())),
    job_title: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : val),
      z.string().max(100, 'İş unvanı en fazla 100 karakter olabilir').optional()
    ),
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

// Account (cari hesap) validation schemas
export const accountSchemas = {
  create: z.object({
    name: z.string()
      .min(1, 'Ad/Ünvan zorunludur')
      .max(200, 'Ad/Ünvan en fazla 200 karakter olabilir')
      .transform((s) => s.trim()),
    type: z.enum(['customer', 'supplier'], { message: 'Tip müşteri veya tedarikçi olmalı' }),
    tax_number: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().max(50).optional()),
    phone: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().max(50).optional()),
    email: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().email('Geçersiz e-posta').max(100).optional()),
    address: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().max(500).optional()),
    risk_limit: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(999999999).optional()),
    discount_rate: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(100).optional()),
    authorized_person_name: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().max(100).optional()),
    authorized_person_phone: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().max(50).optional()),
  }),
}

// Order validation schemas
export const orderSchemas = {
  /** Manuel sipariş oluşturma formu (Siparişler sayfası modal) */
  manualCreate: z.object({
    dealer_name: z.string().min(1, 'Cari / Bayi adı gerekli').max(200, 'En fazla 200 karakter'),
    customer_name: z.string().min(1, 'Müşteri adı gerekli').max(200, 'En fazla 200 karakter'),
    product_name: z.string().min(1, 'Ürün adı gerekli').max(500, 'En fazla 500 karakter'),
    configuration: z.string().min(1, 'Konfigürasyon gerekli').max(200, 'En fazla 200 karakter'),
    fabric_code: z.string().min(1, 'Kumaş kodu gerekli').max(200, 'En fazla 200 karakter'),
    quantity: z.number().min(1, 'Miktar en az 1 olmalı').max(999999, 'Miktar çok büyük'),
    unit_price: z.number().min(0, 'Birim fiyat negatif olamaz').max(999999999.99, 'Fiyat çok büyük'),
    order_date: z.string().min(1, 'Sipariş tarihi gerekli'),
  }),
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