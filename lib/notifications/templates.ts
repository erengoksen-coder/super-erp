/**
 * Basit metin/HTML şablonları. Placeholder: {{placeholder}}
 */

export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
  }
  return out
}

export const emailTemplates = {
  orderConfirmation: {
    subject: 'Sipariş onayı - {{orderNumbers}}',
    text: `Merhaba {{customerName}},\n\nSiparişiniz alındı.\nSipariş numaraları: {{orderNumbers}}\n\nTeşekkürler.`,
    html: `<p>Merhaba <strong>{{customerName}}</strong>,</p><p>Siparişiniz alındı.</p><p>Sipariş numaraları: <strong>{{orderNumbers}}</strong></p><p>Teşekkürler.</p>`,
  },
  shipmentApproved: {
    subject: 'Sevkiyat onaylandı - {{shipmentNumber}}',
    text: `Merhaba {{customerName}},\n\n{{shipmentNumber}} numaralı sevkiyatınız onaylandı.\nToplam tutar: {{finalAmount}} ₺\n\nTeşekkürler.`,
    html: `<p>Merhaba <strong>{{customerName}}</strong>,</p><p><strong>{{shipmentNumber}}</strong> numaralı sevkiyatınız onaylandı.</p><p>Toplam tutar: <strong>{{finalAmount}} ₺</strong></p><p>Teşekkürler.</p>`,
  },
  passwordReset: {
    subject: 'Şifre sıfırlama',
    text: `Merhaba,\n\nŞifre sıfırlama talebiniz alındı. Aşağıdaki linke tıklayarak yeni şifre belirleyebilirsiniz:\n{{resetUrl}}\n\nLink 1 saat geçerlidir.\n\nTeşekkürler.`,
    html: `<p>Merhaba,</p><p>Şifre sıfırlama talebiniz alındı. <a href="{{resetUrl}}">Bu linke</a> tıklayarak yeni şifre belirleyebilirsiniz.</p><p>Link 1 saat geçerlidir.</p><p>Teşekkürler.</p>`,
  },
} as const
