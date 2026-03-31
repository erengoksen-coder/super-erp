'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Webhook as WebhookIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Globe,
  Activity,
  ShieldCheck,
  Zap,
  Lock,
  ExternalLink,
  ChevronRight,
  Monitor,
  CheckCircle2,
  RefreshCw,
  MoreHorizontal,
  Save
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/lib/notify'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'

type WebhookEndpoint = {
  id: string
  url: string
  events: string | null
  description: string | null
  active: number
  created_at: string
}

const EVENT_OPTIONS = [
  'order.created',
  'order.updated',
  'shipment.approved',
  'shipment.created',
  'invoice.issued',
  'stock.low',
  'production.started',
  'production.completed',
]

export default function AdminWebhooksPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [list, setList] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ url: '', events: '', secret: '', description: '' })
  const [confirmDeleteWebhookId, setConfirmDeleteWebhookId] = useState<string | null>(null)

  const isAdmin = isAdminRole(user?.role)

  useEffect(() => {
    if (!user) return
    if (!isAdmin) {
      router.replace('/')
      return
    }
    load()
  }, [user, isAdmin, router])

  async function load() {
    setLoading(true)
    try {
      const res = await fetchApi<WebhookEndpoint[]>('/api/webhooks')
      const data = Array.isArray(res) ? res : (res as { data?: WebhookEndpoint[] })?.data ?? []
      setList(data)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setForm({ url: '', events: '', secret: '', description: '' })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(item: WebhookEndpoint) {
    setForm({
      url: item.url,
      events: item.events || '',
      secret: '',
      description: item.description || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.url.trim()) {
      toast.error('URL gerekli')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const body: Record<string, string> = { url: form.url.trim(), events: form.events.trim(), description: form.description.trim() }
        if (form.secret) body.secret = form.secret.trim()
        await fetchApi(`/api/webhooks/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        toast.success('Webhook güncellendi')
      } else {
        await fetchApi('/api/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: form.url.trim(),
            events: form.events.trim() || undefined,
            secret: form.secret.trim() || undefined,
            description: form.description.trim() || undefined,
          }),
        })
        toast.success('Webhook başarıyla eklendi')
      }
      setShowForm(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'İşlem başarısız')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(item: WebhookEndpoint) {
    try {
      await fetchApi(`/api/webhooks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: item.active ? 0 : 1 }),
      })
      toast.success(item.active ? 'Webhook pasif konuma alındı' : 'Webhook aktif edildi')
      load()
    } catch {
      toast.error('Güncellenemedi')
    }
  }

  async function executeDeleteWebhook(id: string) {
    setConfirmDeleteWebhookId(null)
    try {
      await fetchApi(`/api/webhooks/${id}`, { method: 'DELETE' })
      toast.success('Webhook sistemden kaldırıldı')
      load()
    } catch {
      toast.error('Silinemedi')
    }
  }

  if (!user || !isAdmin) return null

  return (
    <AppDashboardLayout
      title="Webhook Entegrasyonu"
      subtitle="Sistem içi olayların dış servislere HTTP POST ile iletilmesi"
      icon={WebhookIcon}
      actions={
        <Button variant="solid" color="primary" size="sm" onClick={openAdd} className="shadow-lg shadow-primary/25">
          <Plus className="w-4 h-4 mr-2" />
          YENİ WEBHOOK
        </Button>
      }
    >
      <div className="space-y-8 animate-reveal">
         <ConfirmDialog
            isOpen={!!confirmDeleteWebhookId}
            onClose={() => setConfirmDeleteWebhookId(null)}
            onConfirm={() => confirmDeleteWebhookId && executeDeleteWebhook(confirmDeleteWebhookId)}
            title="Webhook Sil"
            message="Bu webhook kaydını kalıcı olarak silmek istediğinize emin misiniz? Dış sistem bildirimleri kesilecektir."
            variant="danger"
         />

         {/* Webhook List Section */}
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
               <Card variant="glass" className="border-white/5 overflow-hidden">
                  <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">Kayıtlı Uç Noktalar (Endpoints)</h3>
                     </div>
                     <button onClick={load} className="p-2 rounded-xl hover:bg-white/5 transition-colors group">
                        <RefreshCw className={cn("w-4 h-4 opacity-40 group-hover:opacity-100 transition-all", loading && "animate-spin opacity-100")} />
                     </button>
                  </CardHeader>
                  <CardBody className="p-6">
                     {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                           <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                           <p className="text-[10px] font-black uppercase tracking-widest">Servisler Taranıyor</p>
                        </div>
                     ) : list.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                           <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 mb-6 text-foreground/10 group">
                              <Globe className="w-16 h-16 group-hover:scale-110 transition-transform" />
                           </div>
                           <h4 className="text-lg font-black uppercase text-foreground/80">Henüz Webhook Yok</h4>
                           <p className="text-[11px] font-medium text-foreground/40 mt-2 uppercase tracking-[0.2em] max-w-xs mx-auto">Sipariş onayı veya stok uyarıları gibi olaylar için dış sistemleri bağlayın.</p>
                           <Button variant="soft" color="primary" className="mt-8 text-[10px] font-black tracking-widest px-8" onClick={openAdd}>İLK WEBHOO'U EKLE</Button>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 gap-4">
                           {list.map((item) => (
                              <div
                                 key={item.id}
                                 className="group flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-primary/20 transition-all"
                              >
                                 <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className={cn("p-4 rounded-2xl shrink-0 transition-all group-hover:scale-110", item.active ? "bg-primary/10 text-primary" : "bg-white/5 text-foreground/20")}>
                                       <Activity className="w-6 h-6 shadow-glow" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                       <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-mono text-xs font-black text-foreground/80 break-all">{item.url}</span>
                                          {item.active ? <Badge variant="soft" color="success" className="text-[7px] font-black px-2 py-0">AKTİF</Badge> : <Badge variant="soft" color="secondary" className="text-[7px] font-black px-2 py-0">PASİF</Badge>}
                                       </div>
                                       <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                                          <Badge variant="glass" className="text-[8px] font-black bg-white/5 border-white/5 text-foreground/40">{item.description || 'GENEL ENTEGRASYON'}</Badge>
                                          <span className="text-[10px] font-bold opacity-30 uppercase tracking-tighter">Olaylar: {item.events || 'TÜMÜ'}</span>
                                       </div>
                                    </div>
                                 </div>
                                 
                                 <div className="flex items-center gap-2 shrink-0 md:bg-white/5 md:p-2 rounded-2xl border border-white/5 self-end md:self-center">
                                    <button
                                       onClick={() => handleToggleActive(item)}
                                       className={cn("p-2.5 rounded-xl transition-all", item.active ? "bg-success/10 text-success hover:bg-success/20" : "bg-white/5 text-foreground/40 hover:bg-white/10")}
                                       title={item.active ? "Devre Dışı Bırak" : "Etkinleştir"}
                                    >
                                       {item.active ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => openEdit(item)} className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all" title="Düzenle">
                                       <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setConfirmDeleteWebhookId(item.id)} className="p-2.5 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all" title="Sil">
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </CardBody>
               </Card>
            </div>

            {/* Admin Info Sidebar */}
            <div className="space-y-6">
               <Card variant="glass" className="bg-primary/5 border-primary/20 group">
                  <CardBody className="p-8 space-y-6">
                     <div className="flex items-center gap-3 text-primary">
                        <Lock className="w-5 h-5 shadow-glow" />
                        <h4 className="text-xs font-black uppercase tracking-widest">Güvenlik Doğrulaması</h4>
                     </div>
                     <p className="text-[11px] font-medium text-foreground/40 leading-relaxed italic uppercase tracking-[0.1em]">Webhook imzalarını doğrulamak için `X-Webhook-Signature` başlığını kullanabilirsiniz. Payload içeriği JSON formatındadır.</p>
                     <div className="pt-4 border-t border-primary/10">
                        <Badge variant="glass" className="w-fit text-[8px] font-black border-primary/20 text-primary">HMAC-SHA256 DESTEĞİ</Badge>
                     </div>
                  </CardBody>
               </Card>

               <div className="p-8 rounded-[2.5rem] bg-secondary/5 border border-secondary/10 relative overflow-hidden group">
                  <Monitor className="absolute -right-4 -bottom-4 w-32 h-32 text-secondary/5 group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10">
                     <h4 className="text-xs font-black uppercase tracking-widest text-secondary mb-3">API Dökümantasyonu</h4>
                     <p className="text-[10px] font-medium opacity-40 leading-relaxed italic mb-6">Veri şemalarını ve olay yapılarını incelemek için API kataloğunu ziyaret edin.</p>
                     <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest hover:bg-white/5 h-auto py-3">
                        KATALOGU GÖRÜNTÜLE
                        <ChevronRight className="w-3 h-3 ml-2" />
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Webhook Modal - Platinum */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <Card variant="glass" className="w-full max-w-lg border-white/10 shadow-3xl shadow-black">
            <CardHeader className="p-8 border-b border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                     <Plus className="w-5 h-5 shadow-glow" />
                  </div>
                  <h3 className="font-black uppercase tracking-widest text-sm">{editingId ? 'WEBHOOK GÜNCELLEME' : 'YENİ WEBHOOK KAYIT'}</h3>
               </div>
               <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-white/5 text-foreground/20 hover:text-foreground transition-all">
                  <X className="w-5 h-5" />
               </button>
            </CardHeader>
            <CardBody className="p-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Uç Nokta URL (HTTP POST) *</label>
                  <Input 
                     variant="filled" 
                     type="url"
                     value={form.url}
                     onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                     placeholder="https://rest.yourapi.com/webhook"
                     className="font-mono text-xs h-12"
                     required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Olay Filtreleri (Virgül ile ayırın)</label>
                  <Input 
                     variant="filled"
                     value={form.events}
                     onChange={(e) => setForm((f) => ({ ...f, events: e.target.value }))}
                     placeholder="order.created, stock.low"
                     className="text-xs h-12"
                  />
                  <p className="text-[9px] font-bold text-foreground/20 uppercase tracking-tighter mt-1">
                     Örneğin: {EVENT_OPTIONS.slice(0, 3).join(', ')} (Boş bırakılırsa tüm olaylar iletilir.)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Gizli Anahtar (Shared Secret)</label>
                  <Input 
                     variant="filled"
                     type="password"
                     value={form.secret}
                     onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                     placeholder="••••••••••••"
                     className="font-mono text-xs h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Kısa Açıklama</label>
                  <Input 
                     variant="filled"
                     value={form.description}
                     onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                     placeholder="Örn: Muhasebe CRM Entegrasyonu"
                     className="text-xs h-12"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                  <Button type="button" variant="ghost" className="px-6" onClick={() => setShowForm(false)}>İPTAL</Button>
                  <Button type="submit" color="primary" disabled={saving} className="px-10 shadow-lg shadow-primary/20">
                     {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                     {editingId ? 'REVİZYONU KAYDET' : 'HESABI OLUŞTUR'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </AppDashboardLayout>
  )
}
