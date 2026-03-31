import { z } from 'zod'

/**
 * Webhook Giriş Doğrulama Şeması
 */
export const webhookSchema = z.object({
  url: z.string().url('Geçerli bir URL girmelisiniz'),
  event_types: z.array(z.string()).min(1, 'En az bir olay tipi seçmelisiniz'),
  description: z.string().max(200, 'Açıklama 200 karakterden fazla olamaz').optional(),
  secret_key: z.string().optional(),
})

/**
 * API Token Giriş Doğrulama Şeması
 */
export const apiTokenSchema = z.object({
  name: z.string().min(3, 'Anahtar adı en az 3 karakter olmalıdır').max(50, 'Anahtar adı 50 karakteri geçemez'),
  scopes: z.array(z.string()).default(['read']),
  ip_restrictions: z.array(z.string()).optional(),
  expires_at: z.string().nullable().optional(),
})

export type WebhookInput = z.infer<typeof webhookSchema>
export type ApiTokenInput = z.infer<typeof apiTokenSchema>
