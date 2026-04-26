'use client'

import React, { useState, useEffect } from 'react'
import { 
  Settings, Save, Bell, Shield, 
  ChevronRight, RefreshCw, Smartphone, 
  CheckCircle2, AlertCircle, Info, LucideIcon
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

interface SystemSettings {
  app_name: string
  company_name: string
  telegram_bot_token: string
  telegram_chat_id: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    app_name: 'LIVASOFA ERP',
    company_name: '',
    telegram_bot_token: '',
    telegram_chat_id: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'telegram' | 'security'>('general')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const data = await fetchApi<any>('/api/settings')
      if (data && typeof data === 'object') {
        setSettings(prev => ({
          ...prev,
          app_name: data.app_name || prev.app_name,
          company_name: data.company_name ?? prev.company_name,
          telegram_bot_token: data.telegram_bot_token ?? prev.telegram_bot_token,
          telegram_chat_id: data.telegram_chat_id ?? prev.telegram_chat_id,
        }))
      }
    } catch (err) {
      console.error('Settings load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await fetchApi('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      })
      toast.success('Ayarlar başarıyla kaydedildi')
    } catch (err) {
      console.error('Settings save error:', err)
      toast.error('Kaydedilirken hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestTelegram = async () => {
    try {
      await fetchApi<any>('/api/system/test-telegram')
      toast.success('✅ Test mesajı başarıyla gönderildi! Telegram\'ınızı kontrol edin.')
    } catch (err: any) {
      toast.error(`Telegram hatası: ${err?.message || 'Bağlantı testi yapılamadı'}`)
    }
  }

  const NavItem = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: LucideIcon, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm group",
        activeTab === tab 
          ? "bg-primary/10 text-primary border border-primary/20 shadow-glow shadow-primary/10" 
          : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
      )}
    >
      <Icon className={cn("w-4 h-4", activeTab === tab ? "text-primary" : "text-slate-600 group-hover:text-slate-400")} />
      {label}
      {activeTab === tab && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
    </button>
  )

  return (
    <AppDashboardLayout
      title="Sistem Ayarları"
      subtitle="Kurumsal yapılandırma, entegrasyonlar ve güvenlik ayarlarını yönetin"
      icon={Settings}
    >
      <div className="flex flex-col lg:flex-row gap-8 pb-10">
        
        {/* Settings Navigation */}
        <div className="w-full lg:w-64 space-y-2 shrink-0">
          <NavItem tab="general" icon={Settings} label="Genel Ayarlar" />
          <NavItem tab="telegram" icon={Smartphone} label="Telegram Entegrasyonu" />
          <NavItem tab="security" icon={Shield} label="Güvenlik & Denetim" />
        </div>

        {/* Settings Content */}
        <div className="flex-1 max-w-4xl">
          <form onSubmit={handleSave}>
            <Card className="glass border-slate-800/50 bg-[#0a0a0a]/80 shadow-2xl">
              <CardBody className="p-8">
                
                {activeTab === 'general' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                      <div className="p-2 rounded-lg bg-primary/20 text-primary shadow-glow shadow-primary/30">
                        <Settings className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-tight">Genel Kurumsal Ayarlar</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1">Uygulama İsmi</label>
                        <input 
                          type="text" 
                          value={settings.app_name}
                          onChange={(e) => setSettings({...settings, app_name: e.target.value})}
                          className="w-full border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                          style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1">Şirket Resmi Ünvanı</label>
                        <input 
                          type="text" 
                          value={settings.company_name}
                          onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                          className="w-full border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                          style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'telegram' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                      <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 shadow-glow shadow-sky-500/30">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-tight">Telegram "Link" Entegrasyonu</h3>
                        <p className="text-xs text-slate-500 font-medium">Sistem olaylarını anında mobile yönlendirin</p>
                      </div>
                    </div>

                    <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-5 flex gap-4">
                      <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-xs text-sky-100 leading-relaxed font-medium">
                          Telegram botu üzerinden bildirim almak için <b>@BotFather</b> aracılığıyla bir bot oluşturun ve token bilgisini aşağıya girin. 
                          Ardından botunuzu başlattığınızda <b>Chat ID</b>'nizi öğrenmek için <b>ID Bot</b> servislerini kullanabilirsiniz.
                        </p>
                        <ul className="text-[10px] text-sky-400 font-bold uppercase tracking-wider list-disc list-inside">
                          <li>Yeni Kullanıcı Kayıtları</li>
                          <li>Bayi Portalı Siparişleri</li>
                          <li>Kritik Silme İşlemleri</li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1">Bot Token (HTTP API Token)</label>
                        <input 
                          type="password" 
                          placeholder="0000000000:AAHHH-XXXXXXXXXXXXXXXXXXXXXXXX"
                          value={settings.telegram_bot_token}
                          onChange={(e) => setSettings({...settings, telegram_bot_token: e.target.value})}
                          className="w-full border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono placeholder:text-slate-500"
                          style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1">Chat ID (Your Account ID)</label>
                        <input 
                          type="text" 
                          placeholder="123456789"
                          value={settings.telegram_chat_id}
                          onChange={(e) => setSettings({...settings, telegram_chat_id: e.target.value})}
                          className="w-full border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono placeholder:text-slate-500"
                          style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-sky-400 hover:text-sky-300 hover:bg-sky-400/10 border border-sky-400/20"
                        onClick={handleTestTelegram}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Bağlantıyı Test Et
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shadow-glow shadow-emerald-500/30">
                        <Shield className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-tight">Güvenlik & Denetim Ayarları</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-slate-900/30 border-slate-800/50 border-dashed">
                        <CardBody className="p-4 flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Yeni Kayıt Onayı</h4>
                            <p className="text-[10px] text-slate-400">Kullanıcılar kendileri kaydolabilir mi?</p>
                          </div>
                          <div className="w-12 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-end px-1 cursor-pointer">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-glow shadow-emerald-500/50" />
                          </div>
                        </CardBody>
                      </Card>

                      <Card className="bg-slate-900/30 border-slate-800/50 border-dashed">
                        <CardBody className="p-4 flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Audit Log Süresi</h4>
                            <p className="text-[10px] text-slate-400">Loglar kaç gün saklansın?</p>
                          </div>
                          <span className="text-xs font-bold text-white bg-slate-800 px-3 py-1 rounded-lg">90 GÜN</span>
                        </CardBody>
                      </Card>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-200 uppercase">Kritik Olay Bildirimleri</h4>
                        <p className="text-[10px] text-slate-400">Tüm "Ironclad" güvenlik olayları şu an aktif.</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                )}
              </CardBody>

              <div className="px-8 py-4 border-t border-white/5 bg-slate-950/50 flex justify-end">
                <Button 
                  type="submit" 
                  variant="solid" 
                  className="px-8 shadow-glow shadow-primary/30"
                  disabled={isSaving}
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Ayarları Kaydet
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </AppDashboardLayout>
  )
}
