import { z } from 'zod';

/**
 * Livasofa ERP Account Validation Schema
 * Ensures data integrity for customer and vendor records.
 */
export const createAccountSchema = z.object({
  code: z.string()
    .min(1, 'Cari kod zorunludur')
    .max(50, 'Cari kod çok uzun')
    .regex(/^[A-Z0-9-]+$/, 'Cari kod sadece harf, rakam ve tire içerebilir'),
  
  name: z.string()
    .min(2, 'Cari isim en az 2 karakter olmalıdır')
    .max(200, 'Cari isim çok uzun'),
  
  type: z.enum(['customer', 'vendor', 'lead']),
  
  tax_number: z.string()
    .regex(/^[0-9]*$/, 'Vergi numarası sadece rakam içerebilir')
    .max(11, 'Vergi numarası en fazla 11 hane olabilir')
    .optional()
    .or(z.literal('')),
  
  email: z.string()
    .email('Geçersiz e-posta adresi')
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .max(20, 'Telefon numarası çok uzun')
    .optional()
    .or(z.literal('')),
  
  address: z.string()
    .max(500, 'Adres çok uzun')
    .optional()
    .or(z.literal('')),
    
  risk_limit: z.number()
    .nonnegative('Risk limiti negatif olamaz')
    .default(0),
    
  discount_rate: z.number()
    .min(0, 'İskonto oranı 0\'dan küçük olamaz')
    .max(100, 'İskonto oranı 100\'den büyük olamaz')
    .default(0),
    
  authorized_person_name: z.string()
    .max(100)
    .optional()
    .or(z.literal('')),
  
  authorized_person_phone: z.string()
    .max(20)
    .optional()
    .or(z.literal('')),
});

export const updateAccountSchema = createAccountSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
