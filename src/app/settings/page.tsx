'use client'

import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Building2, 
  Palette, 
  Database, 
  ShieldCheck, 
  Save, 
  Download, 
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Activity,
  ChevronRight,
  Monitor,
  Bell,
  Lock,
  Globe,
  RefreshCw
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

type SettingsTab = 'general' | 'appearance' | 'maintenance' | 'integrations'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [settings, setSettings] = useState<any>({
    company_name: '',
    company_address: '',
    company_tax_no: '',
    company_logo: '',
    theme_primary_color: '#2563eb',
    theme_dark_mode: 'true'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await fetchApi('/api/system/settings')
      setSettings(data)
    } catch (error) {
      toast.error('Ayarlar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetchApi('/api/system/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      })
      toast.success('Ayarlar başarıyla kaydedildi.')
      window.location.reload()
    } catch (error) {
      toast.error('Kaydedilirken hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setSettings({ ...settings, company_logo: reader.result })
    reader.readAsDataURL(file)
  }

  const downloadBackup = async () => {
    window.location.href = '/api/system/backup'
    toast.info('Yedek hazırlanıyor...')
  }

  const navItems = [
    { id: 'general', label: 'KURUMSAL KİMLİK', icon: Building2 },
    { id: 'appearance', label: 'GÖRÜNÜM & TEMA', icon: Palette },
    { id: 'maintenance', label: 'BAKIM & YEDEK', icon: Database },
    { id: 'integrations', label: 'ENTEGRASYONLAR', icon: Globe },
  ]

  return (
    <AppDashboardLayout
      title="Sistem Konfigürasyonu"
      subtitle="Platform parametreleri ve kurumsal kimlik yönetimi"
      icon={Settings}
      actions={
         <Button variant="solid" color="primary" onClick={handleSave} disabled={saving} className="shadow-lg shadow-primary/25">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Ayarları Uygula
         </Button>
      }
    >
      <div className="flex flex-col lg:flex-row gap-8 animate-reveal">
        {/* Sidebar Nav - Platinum */}
        <div className="w-full lg:w-72 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as SettingsTab)}
              className={cn(
                "w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all group",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-glow-sm shadow-primary/40" 
                  : "bg-white/5 text-foreground/40 hover:bg-white/10 hover:text-foreground/60"
              )}
            >
              <div className="flex items-center gap-3">
                 <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-white" : "text-primary opacity-40 group-hover:opacity-100")} />
                 {item.label}
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", activeTab === item.id ? "translate-x-1" : "opacity-0 group-hover:opacity-20")} />
            </button>
          ))}

          <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
            <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] px-5 mb-2">Gelişmiş</p>
            <a href="/settings/api" className="flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black tracking-widest text-foreground/40 hover:bg-white/5 hover:text-primary transition-colors">
               <Lock className="w-4 h-4 text-primary/40" />
               API & GÜVENLİK
            </a>
            <a href="/settings/integrations" className="flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black tracking-widest text-foreground/40 hover:bg-white/5 hover:text-primary transition-colors">
               <Activity className="w-4 h-4 text-primary/40" />
               SİSTEM GÜNLÜĞÜ
            </a>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <Card variant="glass" className="h-full border-white/5 min-h-[500px]">
            <CardBody className="p-10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                  <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin shadow-glow shadow-primary/20" />
                  <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.3em] animate-pulse">Konfigürasyon Yükleniyor</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  {activeTab === 'general' && (
                    <div className="space-y-10 animate-reveal">
                       <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                             <Building2 className="w-8 h-8 text-primary shadow-glow" />
                          </div>
                          <div>
                             <h3 className="text-xl font-black uppercase tracking-tight">Kurumsal Kimlik</h3>
                             <p className="text-xs font-medium text-foreground/40">Sistem genelinde kullanılacak kurumsal bilgileri tanımlayın.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Ticari Ünvan</label>
                                <Input variant="filled" value={settings.company_name} onChange={e => setSettings({...settings, company_name: e.target.value})} placeholder="Örn: Global Tech Ltd." />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Vergi / Kimlik No</label>
                                <Input variant="filled" value={settings.company_tax_no} onChange={e => setSettings({...settings, company_tax_no: e.target.value})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Resmi Adres</label>
                                <textarea 
                                   className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[120px]"
                                   value={settings.company_address}
                                   onChange={e => setSettings({...settings, company_address: e.target.value})}
                                />
                             </div>
                          </div>

                          <div className="space-y-6">
                             <label className="text-[10px] font-black uppercase tracking-widest text-primary block">Sistem Logosu</label>
                             <div className="relative group">
                                <div className="aspect-square rounded-[2rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 transition-all group-hover:border-primary/50 overflow-hidden">
                                   {settings.company_logo ? (
                                      <img src={settings.company_logo} alt="Logo" className="max-h-[60%] object-contain" />
                                   ) : (
                                      <ImageIcon className="w-12 h-12 opacity-10" />
                                   )}
                                   <input type="file" id="logo-input" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                   <label htmlFor="logo-input" className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                      <Badge variant="glass" className="text-[10px] font-black"><Upload className="w-3 h-3 mr-2" /> LOGO GÜNCELLE</Badge>
                                   </label>
                                </div>
                             </div>
                             <p className="text-[10px] font-bold text-foreground/20 italic text-center">Şeffaf arka planlı (PNG) logolar önerilir.</p>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'appearance' && (
                    <div className="space-y-10 animate-reveal">
                       <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                          <div className="p-4 bg-secondary/10 rounded-2xl border border-secondary/20 text-secondary">
                             <Palette className="w-8 h-8 shadow-glow" />
                          </div>
                          <div>
                             <h3 className="text-xl font-black uppercase tracking-tight">Görünüm & Deneyim</h3>
                             <p className="text-xs font-medium text-foreground/40">Marka renklerinizi ve arayüz tercihlerini kişiselleştirin.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-6">
                             <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-secondary">Birincil Marka Rengi</label>
                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                   <input type="color" value={settings.theme_primary_color} onChange={e => setSettings({...settings, theme_primary_color: e.target.value})} className="w-14 h-14 bg-transparent cursor-pointer rounded-xl overflow-hidden shadow-glow-sm shadow-primary/20" />
                                   <div className="flex-1">
                                      <Input variant="filled" className="font-mono text-xs" value={settings.theme_primary_color} onChange={e => setSettings({...settings, theme_primary_color: e.target.value})} />
                                   </div>
                                </div>
                             </div>
                             
                             <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                   <span className="text-xs font-bold text-foreground/60 uppercase tracking-widest">Karanlık Mod</span>
                                   <Badge color="success" variant="soft" className="text-[8px] font-black">VARSAYILAN</Badge>
                                </div>
                                <p className="text-[10px] font-medium opacity-30 leading-relaxed italic">Super ERP Platinum tasarımı yüksek kontrastlı karanlık mod için optimize edilmiştir.</p>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-20 block">Önizleme (Canlı)</label>
                             <div className="p-8 rounded-3xl bg-black/20 border border-white/5 flex flex-col gap-3">
                                <div className="h-4 w-3/4 bg-white/5 rounded-full" />
                                <div className="h-4 w-1/2 bg-white/5 rounded-full" />
                                <div className="flex gap-2 mt-2">
                                   <div className="h-8 w-24 rounded-lg bg-primary/20 border border-primary/30 shadow-glow shadow-primary/10" />
                                   <div className="h-8 w-24 rounded-lg bg-white/5 border border-white/5" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'maintenance' && (
                    <div className="space-y-10 animate-reveal">
                       <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                          <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
                             <Database className="w-8 h-8 shadow-glow" />
                          </div>
                          <div>
                             <h3 className="text-xl font-black uppercase tracking-tight">Sistem Bakımı</h3>
                             <p className="text-xs font-medium text-foreground/40">Veritabanı yedekleme ve güvenlik araçları.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <Card variant="glass" className="bg-success/5 border-success/10 group hover:border-success/30 transition-all cursor-pointer" onClick={downloadBackup}>
                             <CardBody className="p-8 flex flex-col items-center text-center gap-4">
                                <div className="p-4 rounded-2xl bg-success/10 text-success group-hover:scale-110 transition-transform">
                                   <Download className="w-8 h-8" />
                                </div>
                                <div>
                                   <h4 className="text-sm font-black uppercase">Fiziksel Yedek Al</h4>
                                   <p className="text-[10px] font-medium opacity-40 mt-1 uppercase tracking-widest">GÜNCEL VERİTABANI (.DB) İNDİR</p>
                                </div>
                             </CardBody>
                          </Card>

                          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                             <div className="flex items-center gap-3 text-warning">
                                <AlertCircle className="w-5 h-5 shadow-glow" />
                                <h4 className="text-xs font-black uppercase tracking-widest">Sistem Güvenliği</h4>
                             </div>
                             <p className="text-[11px] font-medium text-foreground/40 leading-relaxed italic">
                                Veritabanı yedekleri sadece şema ve verileri içerir. Kullanıcı oturumları ve sırlar bu yedeklere dahil değildir. Düzenli yedekleme yapılması kritik öneme sahiptir.
                             </p>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'integrations' && (
                    <div className="space-y-10 animate-reveal">
                       <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                             <Globe className="w-8 h-8 shadow-glow" />
                          </div>
                          <div>
                             <h3 className="text-xl font-black uppercase tracking-tight">Entegrasyon Yönetimi</h3>
                             <p className="text-xs font-medium text-foreground/40">Dış servisler ve E-Devlet entegrasyon ayarları.</p>
                          </div>
                       </div>
                       
                       <div className="p-20 text-center">
                          <Monitor className="w-16 h-16 text-foreground/10 mx-auto mb-6" />
                          <p className="text-xs font-black text-foreground/20 uppercase tracking-[0.3em]">Entegrasyon merkezi hazırlık aşamasında</p>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppDashboardLayout>
  )
}
