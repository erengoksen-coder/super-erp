'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, ArrowLeft, Send } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'

type MessagingSettings = {
  telegram_bot_token: string
  telegram_chat_id: string
  whatsapp_webhook_url: string
  messaging_events: string
  telegram_configured: boolean
}

export default function MessagingSettingsPage() {
  const [settings, setSettings] = useState<MessagingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [form, setForm] = useState({
    telegram_bot_token: '',
    telegram_chat_id: '',
    whatsapp_webhook_url: '',
    messaging_events: 'order.created',
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      const data = await fetchApi<MessagingSettings | { data: MessagingSettings }>('/api/settings/messaging')
      const s = (data && typeof data === 'object' && 'telegram_chat_id' in data) ? data as MessagingSettings : (data as { data?: MessagingSettings })?.data ?? null
      setSettings(s ?? null)
      if (s) {
        setForm({
          telegram_bot_token: '',
          telegram_chat_id: s.telegram_chat_id || '',
          whatsapp_webhook_url: s.whatsapp_webhook_url || '',
          messaging_events: s.messaging_events || 'order.created',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      await fetchApi('/api/settings/messaging', {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          telegram_bot_token: form.telegram_bot_token || undefined,
        }),
      })
      toast.success('Ayarlar kaydedildi')
      await load()
    } catch {
      toast.error('Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  async function testMessage() {
    setTesting(true)
    try {
      await fetchApi('/api/settings/messaging', {
        method: 'POST',
      })
      toast.success('Test mesajı başarıyla gönderildi!')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Test mesajı gönderilemedi')
    } finally {
      setTesting(false)
    }
  }

  return (
    <AppDashboardLayout
      title="WhatsApp / Telegram bildirimleri"
      subtitle="Yeni sipariş oluştuğunda Telegram veya WhatsApp webhook ile bildirim"
      icon={MessageCircle}
    >
      <div className="mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" /> Ayarlara dön
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-400">Yükleniyor…</p>
      ) : (
        <Card>
          <CardHeader title="Sipariş bildirim botu" />
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-400">
              Yeni sipariş kaydedildiğinde bu kanallara kısa bir mesaj gönderilir. Telegram için @BotFather ile bot oluşturup token ve chat id girin.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Telegram Bot Token</label>
              <input
                type="password"
                placeholder={settings?.telegram_configured ? '•••••••• (değiştirmek için yeni girin)' : '123456789:AAH...'}
                value={form.telegram_bot_token}
                onChange={(e) => setForm((f) => ({ ...f, telegram_bot_token: e.target.value }))}
                className="w-full max-w-md px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Telegram Chat ID</label>
              <input
                type="text"
                placeholder="1546128015 veya -1001234567890 (sayı, @kullanıcı_adı değil)"
                value={form.telegram_chat_id}
                onChange={(e) => setForm((f) => ({ ...f, telegram_chat_id: e.target.value }))}
                className="w-full max-w-md px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
              />
              <p className="text-xs text-slate-500 mt-1">Sayısal ID girin. @Livasofa_bot gibi kullanıcı adı değil. ID almak için: @userinfobot ile /start veya botu gruba ekleyip getUpdates ile bakın.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">WhatsApp webhook URL (isteğe bağlı)</label>
              <input
                type="url"
                placeholder="https://..."
                value={form.whatsapp_webhook_url}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp_webhook_url: e.target.value }))}
                className="w-full max-w-md px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
              />
              <p className="text-xs text-slate-500 mt-1">Sipariş oluşunca POST ile bildirim gönderilir. Kendi sunucunuz veya bir sağlayıcı (Twilio vb.) kullanabilirsiniz.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Bildirim gönderilecek olaylar</label>
              <input
                type="text"
                placeholder="order.created"
                value={form.messaging_events}
                onChange={(e) => setForm((f) => ({ ...f, messaging_events: e.target.value }))}
                className="w-full max-w-md px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
              />
              <p className="text-xs text-slate-500 mt-1">Virgülle ayırın. Örn: order.created, shipment.created</p>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
              <Button onClick={save} disabled={saving} className="inline-flex items-center gap-2">
                <Send className="h-4 w-4" /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </Button>

              <Button
                onClick={testMessage}
                disabled={testing || !settings?.telegram_configured}
                variant="outline"
                className="inline-flex items-center gap-2"
                title={!settings?.telegram_configured ? 'Önce Telegram ayarlarını kaydedin' : ''}
              >
                <MessageCircle className="h-4 w-4" /> {testing ? 'Gönderiliyor…' : 'Test Mesajı Gönder'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </AppDashboardLayout>
  )
}
