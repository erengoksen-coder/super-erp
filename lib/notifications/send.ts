/**
 * E-posta ve SMS bildirimleri (opsiyonel).
 * SMTP veya SMS sağlayıcı yapılandırılmamışsa sadece log yazılır.
 * ENABLE_EMAIL_NOTIFICATIONS=false ise e-posta gönderilmez (şifre sıfırlama dahil).
 */

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@livasofa.com'
const SMS_API_URL = process.env.SMS_API_URL
const SMS_API_KEY = process.env.SMS_API_KEY

/** E-posta bildirimleri kapalıysa (env ile) gerçek gönderim yapılmaz. Varsayılan: açık. */
function isEmailEnabled(): boolean {
  const v = process.env.ENABLE_EMAIL_NOTIFICATIONS
  if (v === undefined || v === '') return true
  return v === '1' || v.toLowerCase() === 'true' || v === 'yes'
}

export type EmailOptions = {
  to: string | string[]
  subject: string
  text?: string
  html?: string
}

export type SmsOptions = {
  phone: string
  message: string
}

/**
 * E-posta gönderir. SMTP yapılandırılmamışsa console'a yazar.
 */
export async function sendEmail(options: EmailOptions): Promise<{ ok: boolean; error?: string }> {
  const toList = Array.isArray(options.to) ? options.to : [options.to]
  if (!isEmailEnabled()) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Notifications] E-posta (kapalı, log):', { to: toList, subject: options.subject })
    }
    return { ok: false, error: 'E-posta bildirimleri kapatılmış (ENABLE_EMAIL_NOTIFICATIONS).' }
  }
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Notifications] E-posta (SMTP yok):', { to: toList, subject: options.subject })
    }
    return { ok: false, error: 'E-posta sunucusu (SMTP) yapılandırılmamış. .env.local içinde SMTP_USER ve SMTP_PASS doldurup sunucuyu yeniden başlatın. Gmail: docs/SMTP_GMAIL.md' }
  }
  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587', 10),
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
    await transporter.sendMail({
      from: SMTP_FROM,
      to: toList.join(', '),
      subject: options.subject,
      text: options.text || options.html?.replace(/<[^>]+>/g, '') || '',
      html: options.html,
    })
    return { ok: true }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    console.error('[Notifications] E-posta hatası:', err)
    return { ok: false, error: err }
  }
}

/**
 * SMS gönderir. SMS_API_URL yapılandırılmamışsa console'a yazar.
 */
export async function sendSms(options: SmsOptions): Promise<{ ok: boolean; error?: string }> {
  if (!SMS_API_URL || !SMS_API_KEY) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Notifications] SMS (API yok, log):', { phone: options.phone, message: options.message.slice(0, 50) + '...' })
    }
    return { ok: true }
  }
  try {
    const res = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SMS_API_KEY}` },
      body: JSON.stringify({ phone: options.phone, message: options.message }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status}: ${text}`)
    }
    return { ok: true }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    console.error('[Notifications] SMS hatası:', err)
    return { ok: false, error: err }
  }
}
