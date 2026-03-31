import { z } from 'zod'

/**
 * Yevmiye Fişi Satırı Doğrulama
 */
export const journalEntryLineSchema = z.object({
  account_code: z.string().min(1, 'Hesap kodu zorunludur'),
  debit: z.number().nonnegative('Borç tutarı negatif olamaz').default(0),
  credit: z.number().nonnegative('Alacak tutarı negatif olamaz').default(0),
  description: z.string().max(255, 'Açıklama çok uzun').optional(),
})

/**
 * Yevmiye Fişi Doğrulama
 */
export const journalEntrySchema = z.object({
  entry_date: z.string().refine(val => !isNaN(Date.parse(val)), 'Geçersiz tarih formatı'),
  description: z.string().min(1, 'Açıklama zorunludur').max(500, 'Açıklama çok uzun'),
  reference_type: z.string().default('manual'),
  reference_id: z.string().optional(),
  lines: z.array(journalEntryLineSchema).min(2, 'En az iki satır gereklidir'),
}).refine(data => {
  const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0)
  const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0)
  return Math.abs(totalDebit - totalCredit) < 0.01
}, {
  message: 'Borç ve alacak toplamları eşit olmalıdır',
  path: ['lines']
})

export type JournalEntryLineInput = z.infer<typeof journalEntryLineSchema>
export type JournalEntryInput = z.infer<typeof journalEntrySchema>
