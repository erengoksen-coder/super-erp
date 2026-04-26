'use client'

import { useState, useEffect } from 'react'
import { 
  Send, 
  Save, 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  MessageSquare, 
  Zap, 
  ShieldCheck, 
  Command, 
  Info,
  ChevronRight,
  RefreshCw,
  Globe,
  Smartphone,
  CheckCircle2,
  Lock
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

export default function MessagingSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [settings, setSettings] = useState({
    telegram_bot_token: '',
    telegram_chat_id: '',
    whatsapp_webhook_url: '',
    messaging_events: 'order.created',
    telegram_configured: false
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await fetchApi<any>('/api/settings/messaging')
      setSettings({
        ...settings,
        ...data,
        telegram_bot_token: data.telegram_bot_token.includes('…') ? '' : data.telegram_bot_token
      })
    } catch (err) {
      toast.error('Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetchApi('/api/settings/messaging', {
        method: 'PATCH',
        body: JSON.stringify(settings)
      })
      toast.success('Ayarlar başarıyla kaydedildi')
      loadSettings()
    } catch (err: any) {
      toast.error(err.message || 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleTestTelegram = async () => {
    setTesting(true)
    try {
      await fetchApi('/api/settings/messaging', { method: 'POST' })
      toast.success('Test mesajı gönderildi. Lütfen Telegram\'ı kontrol edin.')
    } catch (err: any) {
      toast.error(err.message || 'Test başarısız')
    } finally {
      setTesting(false)
    }
  }

  return (
    <AppDashboardLayout
      title="Mesajlaşma & Bildirimler"
      subtitle="Telegram ve dijital kanal entegrasyonu parametreleri"
      icon={Globe}
      actions={
         <Button variant="solid" color="primary" size="sm" onClick={handleSave} disabled={saving} className="shadow-lg shadow-primary/20">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Konfigürasyonu Uygula
         </Button>
      }
    >
      <div className="max-w-5xl mx-auto space-y-10 animate-reveal">
         {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
               <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin shadow-glow shadow-primary/20" />
               <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.3em] animate-pulse">Servisler Taranıyor</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
               {/* Left: Main Form */}
               <div className="lg:col-span-3 space-y-10">
                  <Card variant="glass" className="border-white/5 overflow-hidden">
                     <CardHeader className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                              <MessageSquare className="w-8 h-8 shadow-glow" />
                           </div>
                           <div>
                              <h2 className="text-xl font-black uppercase tracking-tight">Telegram Entegrasyonu</h2>
                              <p className="text-xs font-bold text-foreground/30 uppercase mt-1">REAL-TIME OTO-BİLDİRİM SERVİSİ</p>
                           </div>
                        </div>
                        {settings.telegram_configured && (
                           <Badge variant="soft" color="success" className="text-[9px] font-black px-4 h-8 tracking-widest flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5" /> AKTİF
                           </Badge>
                        )}
                     </CardHeader>
                     <CardBody className="p-10 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-primary">Bot Sunucu Tokanı (API Token)</label>
                              <Input 
                                 variant="filled" 
                                 type="password"
                                 placeholder={settings.telegram_configured ? '••••••••••••••••' : 'A586XY...'}
                                 value={settings.telegram_bot_token}
                                 onChange={e => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                                 className="font-mono text-xs h-12"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-primary">Konuşma / Grup Kimliği (Chat ID)</label>
                              <Input 
                                 variant="filled"
                                 placeholder="-100..."
                                 value={settings.telegram_chat_id}
                                 onChange={e => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                                 className="font-mono text-xs h-12"
                              />
                           </div>
                        </div>

                        <div className="p-8 bg-white/5 rounded-3xl border border-white/5 space-y-6">
                           <div className="flex items-center gap-3">
                              <Bell className="w-5 h-5 text-warning shadow-glow" />
                              <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">Olay Tetikleyiciler</h3>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <label className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer group transition-all hover:bg-white/10 active:scale-[0.98]">
                                 <div className="relative">
                                    <input
                                       type="checkbox"
                                       checked={settings.messaging_events.includes('order.created')}
                                       onChange={e => {
                                          const current = settings.messaging_events.split(',').filter(Boolean)
                                          const updated = e.target.checked 
                                          ? [...current, 'order.created']
                                          : current.filter(x => x !== 'order.created')
                                          setSettings({ ...settings, messaging_events: updated.join(',') })
                                       }}
                                       className="w-5 h-5 rounded-lg border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                                    />
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-tight text-foreground/80 group-hover:text-primary transition-colors">Yeni Sipariş Bildirimi</span>
                                    <span className="text-[9px] font-bold text-foreground/20 italic tracking-tighter uppercase">Her sipariş girişinde anlık mesaj</span>
                                 </div>
                              </label>

                              <label className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5/5 opacity-40 cursor-not-allowed">
                                 <div className="w-5 h-5 rounded-lg border border-white/10 bg-white/5" />
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-tight">Stok Uyarıları</span>
                                    <span className="text-[9px] font-bold italic tracking-tighter uppercase">Kritik seviye bildirimleri (Yakında)</span>
                                 </div>
                              </label>
                           </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                           <Button
                              variant="ghost"
                              disabled={!settings.telegram_configured || testing}
                              onClick={handleTestTelegram}
                              className="text-[10px] font-black uppercase tracking-[0.2em] h-auto py-3 px-6 hover:bg-primary/5 hover:text-primary"
                           >
                              {testing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                              PING / TEST GÖNDER
                           </Button>
                           
                           <Button
                              disabled={saving}
                              onClick={handleSave}
                              color="primary"
                              className={cn("text-[10px] font-black uppercase tracking-[0.2em] h-auto py-3 px-8", saving && "animate-pulse")}
                           >
                              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                              REVİZYONU UYGULA
                           </Button>
                        </div>
                     </CardBody>
                  </Card>
               </div>

               {/* Right: Sidebar Info */}
               <div className="space-y-8">
                  <Card variant="glass" className="bg-amber-500/5 border-amber-500/20 group overflow-hidden">
                     <CardBody className="p-8 space-y-6 relative">
                        <Command className="absolute -right-4 -bottom-4 w-32 h-32 text-amber-500/10 group-hover:scale-110 transition-transform duration-700" />
                        <div className="flex items-center gap-3 text-warning relative z-10">
                           <Zap className="w-5 h-5 shadow-glow shadow-warning/40" />
                           <h4 className="text-xs font-black uppercase tracking-widest">Kurulum Rehberi</h4>
                        </div>
                        <div className="space-y-4 relative z-10">
                           {[
                              { step: "01", text: "@BotFather üzerinden bot oluşturun.", icon: Smartphone },
                              { step: "02", text: "API Token değerini bot ayarlarından alın.", icon: Lock },
                              { step: "03", text: "Botu bildirim grubuna ekleyip Chat ID'yi girin.", icon: MessageSquare },
                           ].map((item, i) => (
                              <div key={i} className="flex gap-4 group/item">
                                 <span className="text-[10px] font-black text-amber-500/40 group-hover/item:text-amber-500 transition-colors">{item.step}</span>
                                 <p className="text-[11px] font-medium text-foreground/50 leading-relaxed uppercase tracking-tighter">{item.text}</p>
                              </div>
                           ))}
                        </div>
                        <div className="pt-4 border-t border-amber-500/10 flex justify-center relative z-10">
                           <a href="https://t.me/BotFather" target="_blank" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-warning hover:opacity-100 opacity-60 transition-opacity">
                              @BOTFATHER AÇ <ChevronRight className="w-3 h-3" />
                           </a>
                        </div>
                     </CardBody>
                  </Card>

                  <Card variant="glass" className="bg-primary/5 border-primary/20">
                     <CardBody className="p-8 space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                           <ShieldCheck className="w-5 h-5 shadow-glow" />
                           <h4 className="text-xs font-black uppercase tracking-widest">Sistem Güvenliği</h4>
                        </div>
                        <p className="text-[10px] font-medium text-foreground/40 leading-relaxed italic uppercase tracking-[0.1em]">Tüm mesajlaşma ayarları veritabanında AES-256 algoritması ile şifrelenerek saklanmaktadır. Token değerleri maskelenmiş olarak görüntülenir.</p>
                     </CardBody>
                  </Card>
               </div>
            </div>
         )}
      </div>
    </AppDashboardLayout>
  )
}
