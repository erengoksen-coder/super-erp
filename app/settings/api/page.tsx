'use client'

import React, { useState, useEffect } from 'react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { Webhook as WebhookIcon, Code, ExternalLink, Trash2, Plus, CheckCircle2, Copy, AlertTriangle, ShieldCheck, Key, Zap, Info, Clock, History, Globe, Lock, Terminal } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { mutate } from 'swr'

interface Webhook {
  id: string
  url: string
  event_types: string[]
  secret_key: string | null
  description: string | null
  is_active: number
}

interface APIToken {
  id: string
  name: string
  token_masked: string
  last_used_at: string | null
  created_at: string
  is_active: number
  scopes: string[]
  ip_restrictions: string[]
  expires_at: string | null
}

interface WebhookLog {
  id: string
  webhook_id: string
  webhook_url: string
  event_type: string
  status_code: number
  duration_ms: number
  created_at: string
}

export default function APISettingsPage() {
  const { data: webhooks = [], isLoading: whLoading } = useApi<Webhook[]>('/api/system/webhooks')
  const { data: tokens = [], isLoading: tokensLoading } = useApi<APIToken[]>('/api/system/tokens')
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  
  // Webhook State
  const [newUrl, setNewUrl] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['order.created'])
  const [confirmDeleteWebhookId, setConfirmDeleteWebhookId] = useState<string | null>(null)
  const [testingWhId, setTestingWhId] = useState<string | null>(null)
  const [viewingLogsWhId, setViewingLogsWhId] = useState<string | null>(null)

  // Token State
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>(['read'])
  const [newTokenIps, setNewTokenIps] = useState('')
  const [newTokenExpiry, setNewTokenExpiry] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [confirmDeleteTokenId, setConfirmDeleteTokenId] = useState<string | null>(null)

  const availableEvents = [
    { id: 'order.created', label: 'Yeni Sipariş' },
    { id: 'order.updated', label: 'Sipariş Güncelleme' },
    { id: 'stock.movement', label: 'Stok Hareketi' },
    { id: 'production.started', label: 'Üretim Başladı' },
    { id: 'production.completed', label: 'Üretim Tamamlandı' },
  ]

  const availableScopes = [
    { id: 'read', label: 'Sadece Okuma (Genel)', color: 'blue' },
    { id: 'write', label: 'Yazma Yetkisi (Genel)', color: 'amber' },
    { id: 'accounting', label: 'Muhasebe Erişimi', color: 'emerald' },
    { id: 'inventory', label: 'Stok & Depo', color: 'purple' },
    { id: 'hr', label: 'Personel Verileri', color: 'rose' },
  ]

  async function loadWebhookLogs(whId?: string) {
    try {
      setLogsLoading(true)
      const url = whId ? `/api/system/webhooks/logs?webhook_id=${whId}` : '/api/system/webhooks/logs'
      const data = await fetchApi(url) as WebhookLog[]
      setWebhookLogs(data || [])
    } catch (err: any) {
      toast.error('Loglar yüklenemedi')
    } finally {
      setLogsLoading(false)
    }
  }

  // Webhook Actions
  async function handleAddWebhook() {
    if (!newUrl.startsWith('http')) {
      toast.error('Geçerli bir URL giriniz')
      return
    }

    try {
      await fetchApi('/api/system/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          description: newDesc,
          event_types: selectedEvents,
          secret_key: `sec_${Math.random().toString(36).substring(2, 12)}`
        })
      })
      toast.success('Webhook eklendi')
      setNewUrl('')
      setNewDesc('')
      mutate('/api/system/webhooks')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleTestWebhook(wh: Webhook) {
    setTestingWhId(wh.id)
    try {
      const result = await fetchApi('/api/system/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wh.id })
      }) as { statusCode: number, duration: number }
      
      toast.success(`${wh.url} adresine test sinyali başarıyla gönderildi (HTTP ${result.statusCode}, ${result.duration}ms)`)
      // Log listesini yenile
      if (viewingLogsWhId === wh.id) {
        loadWebhookLogs(wh.id)
      } else {
        // Logları hemen görsün diye modalı açabiliriz veya sadece arka planda yükleyebiliriz
        loadWebhookLogs(wh.id)
      }
    } catch (err: any) {
      toast.error(`Bağlantı testi başarısız: ${err.message}`)
      loadWebhookLogs(wh.id)
    } finally {
      setTestingWhId(null)
    }
  }

  async function executeDeleteWebhook(id: string) {
    setConfirmDeleteWebhookId(null)
    try {
      await fetchApi(`/api/system/webhooks?id=${id}`, { method: 'DELETE' })
      toast.success('Silindi')
      mutate('/api/system/webhooks')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Token Actions
  async function handleAddToken() {
    if (!newTokenName.trim()) {
      toast.error('Anahtar adı zorunludur')
      return
    }

    try {
      const resp = await fetchApi('/api/system/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newTokenName,
          scopes: newTokenScopes,
          ip_restrictions: newTokenIps.split(',').map(s => s.trim()).filter(Boolean),
          expires_at: newTokenExpiry || null
        })
      }) as { token: string }
      setCreatedToken(resp.token)
      setNewTokenName('')
      setNewTokenIps('')
      setNewTokenExpiry('')
      setShowTokenModal(false)
      mutate('/api/system/tokens')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function executeDeleteToken(id: string) {
    setConfirmDeleteTokenId(null)
    try {
      await fetchApi(`/api/system/tokens?id=${id}`, { method: 'DELETE' })
      toast.success('API Anahtarı iptal edildi')
      mutate('/api/system/tokens')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Panoya kopyalandı')
  }

  const getLogStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-emerald-400'
    if (code >= 400) return 'text-rose-400'
    return 'text-amber-400'
  }

  return (
    <AppDashboardLayout title="API & Entegrasyon" subtitle="Kurumsal entegrasyon altyapısını ve güvenliğini yönetin">
      {/* Modals */}
      <ConfirmDialog
        isOpen={!!confirmDeleteWebhookId}
        onClose={() => setConfirmDeleteWebhookId(null)}
        onConfirm={() => confirmDeleteWebhookId && executeDeleteWebhook(confirmDeleteWebhookId)}
        title="Webhook Sil"
        message="Bu webhooku silmek istediğinize emin misiniz? Bağlı tüm sistemler veri almayı durduracaktır."
        variant="danger"
      />
      <ConfirmDialog
        isOpen={!!confirmDeleteTokenId}
        onClose={() => setConfirmDeleteTokenId(null)}
        onConfirm={() => confirmDeleteTokenId && executeDeleteToken(confirmDeleteTokenId)}
        title="API Anahtarını İptal Et"
        message="Bu anahtar iptal edildiğinde, bu anahtarı kullanan harici uygulamalar anında erişim kaybeder."
        variant="danger"
      />

      {/* Advanced Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-primary/30 shadow-2xl">
            <CardBody className="p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Yeni Güvenli API Anahtarı
                </h3>
                <button onClick={() => setShowTokenModal(false)} className="text-gray-500 hover:text-white">&times;</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input 
                    label="Anahtar Adı" 
                    placeholder="Örn: ERP Mobil Uygulama"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                      Yetki Kapsamı (Scopes)
                      <Lock className="w-3 h-3" />
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {availableScopes.map(scope => (
                        <label key={scope.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-transparent hover:border-white/10 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-700 bg-gray-900 text-primary"
                            checked={newTokenScopes.includes(scope.id)}
                            onChange={(e) => {
                              if (e.target.checked) setNewTokenScopes([...newTokenScopes, scope.id])
                              else setNewTokenScopes(newTokenScopes.filter(s => s !== scope.id))
                            }}
                          />
                          <span className="text-sm text-gray-300">{scope.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input 
                    label="IP Kısıtlaması (İsteğe Bağlı)" 
                    placeholder="192.168.1.1, 10.0.0.5"
                    value={newTokenIps}
                    onChange={(e) => setNewTokenIps(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-500">Virgül ile ayırarak güvenilir IP adreslerini girin. Boş bırakırsanız her yerden erişilebilir.</p>
                  
                  <Input 
                    label="Son Kullanma Tarihi" 
                    type="date"
                    value={newTokenExpiry}
                    onChange={(e) => setNewTokenExpiry(e.target.value)}
                  />
                  
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <ShieldCheck className="w-4 h-4" />
                      Güvenlik Özeti
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Oluşturacağınız bu anahtar {newTokenScopes.length} farklı modüle erişim yetkisine sahip olacak. 
                      Anahtarı sistem dışına çıkarmadan önce yetkileri minimize etmeniz önerilir.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" fullWidth onClick={() => setShowTokenModal(false)}>İptal</Button>
                <Button fullWidth onClick={handleAddToken}>Anahtarı Üret</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Log Detail Modal */}
      {viewingLogsWhId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col border-gray-800">
            <CardBody className="p-0 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Webhook Gönderim Geçmişi</h3>
                    <p className="text-xs text-gray-500 italic">Son 50 işlem listeleniyor</p>
                  </div>
                </div>
                <button onClick={() => setViewingLogsWhId(null)} className="text-gray-500 hover:text-white text-2xl">&times;</button>
              </div>
              
              <div className="overflow-auto flex-1 bg-black/20">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-900 border-b border-gray-800">
                    <TableRow>
                      <TableHead>Tarih/Saat</TableHead>
                      <TableHead>Olay</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Süre (ms)</TableHead>
                      <TableHead className="text-right">Detay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableSkeleton rows={5} cols={5} />
                    ) : webhookLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-500 italic">
                          Bu webhook için henüz bir kayıt bulunmuyor.
                        </TableCell>
                      </TableRow>
                    ) : webhookLogs.map(log => (
                      <TableRow key={log.id} className="border-gray-800 hover:bg-white/5 transition-colors">
                        <TableCell className="text-xs text-gray-400 font-mono">
                          {new Date(log.created_at).toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="soft" color="primary" className="text-[10px]">{log.event_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`font-black flex items-center gap-1.5 ${getLogStatusColor(log.status_code)}`}>
                            {log.status_code === 200 && <CheckCircle2 className="w-3 h-3" />}
                            {log.status_code}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 font-mono">{log.duration_ms}ms</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="xs"><Info className="w-3 h-3" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="p-4 border-t border-gray-800 flex justify-end shrink-0">
                <Button variant="ghost" onClick={() => setViewingLogsWhId(null)}>Kapat</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* New Token Display Modal (Simple) */}
      {createdToken && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-primary/50 shadow-2xl shadow-primary/20 bg-gray-900">
            <CardBody className="p-8 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <Key className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center text-white">Yeni API Anahtarınız</h3>
              <p className="text-sm text-gray-400 text-center leading-relaxed">
                Güvenlik gereği bu anahtar <span className="text-red-400 font-bold underline">sadece bir kez</span> gösterilecektir. Lütfen hemen güvenli bir yere kaydedin.
              </p>
              <div className="bg-black/60 p-4 rounded-xl border border-gray-800 font-mono text-xs break-all flex justify-between items-center gap-2">
                <span className="text-primary text-sm font-black">{createdToken}</span>
                <Button variant="ghost" size="xs" onClick={() => copyToClipboard(createdToken)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button fullWidth onClick={() => setCreatedToken(null)} className="mt-4">Okudum, Kaydettim</Button>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        <Tabs defaultValue="webhooks" className="w-full">
          <TabsList className="bg-gray-900 border border-gray-800 p-1 rounded-xl mb-6">
            <TabsTrigger value="webhooks" className="px-6 py-2 rounded-lg data-[state=active]:bg-primary">
              <WebhookIcon className="w-4 h-4 mr-2" />
              Webhooklar & Geçmiş
            </TabsTrigger>
            <TabsTrigger value="keys" className="px-6 py-2 rounded-lg data-[state=active]:bg-primary">
              <Lock className="w-4 h-4 mr-2" />
              API Anahtarları
            </TabsTrigger>
            <TabsTrigger value="catalog" className="px-6 py-2 rounded-lg data-[state=active]:bg-primary">
              <Terminal className="w-4 h-4 mr-2" />
              API Kataloğu (DX)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card variant="glass" className="lg:col-span-1 border-gray-800 h-fit">
                <CardBody className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Yeni Webhook
                  </h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Sistem olaylarını (yeni sipariş, stok hareketi vb.) gerçek zamanlı olarak dinlemek için bir hedef URL tanımlayın.
                  </p>
                  
                  <div className="space-y-4 pt-2">
                    <Input 
                      label="Hedef URL" 
                      placeholder="https://api.sitem.com/webhook"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                    <Input 
                      label="Açıklama" 
                      placeholder="E-ticaret senkronizasyonu"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        Olay Tipleri
                        <Info className="w-3 h-3 text-gray-600" />
                      </label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {availableEvents.map(event => (
                          <label key={event.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition group">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-700 bg-gray-800 text-primary focus:ring-primary"
                              checked={selectedEvents.includes(event.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedEvents([...selectedEvents, event.id])
                                else setSelectedEvents(selectedEvents.filter(id => id !== event.id))
                              }}
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition">{event.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button fullWidth onClick={handleAddWebhook} className="mt-4 shadow-lg shadow-primary/20">
                      Webhook Kaydet
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card variant="elevated" className="lg:col-span-2 border-gray-800 bg-gray-900/40">
                <CardBody className="p-0">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-gray-800">
                        <TableHead>Hedef & Açıklama</TableHead>
                        <TableHead>Abonelikler</TableHead>
                        <TableHead>Güvenlik</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {whLoading ? (
                        <TableSkeleton rows={3} cols={4} />
                      ) : webhooks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-16 text-gray-500">
                            <WebhookIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            Henüz yapılandırılmış bir webhook bulunmuyor.
                          </TableCell>
                        </TableRow>
                      ) : webhooks.map((wh) => (
                        <TableRow key={wh.id} className="border-gray-800 hover:bg-white/5 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-white text-sm truncate max-w-[200px]">{wh.url}</span>
                              <span className="text-xs text-gray-500 italic mt-1">{wh.description || 'Açıklama yok'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {wh.event_types.map(et => (
                                <Badge key={et} variant="soft" color="primary" className="text-[10px] px-1.5 py-0">
                                  {et}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {wh.secret_key ? (
                              <button 
                                onClick={() => copyToClipboard(wh.secret_key!)}
                                className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 hover:bg-emerald-500/20 transition"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                Secret Kopyala
                              </button>
                            ) : (
                              <span className="text-gray-600 text-[10px]">Güvensiz</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-gray-400 hover:text-white"
                                onClick={() => { setViewingLogsWhId(wh.id); loadWebhookLogs(wh.id); }}
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                color="primary" 
                                onClick={() => handleTestWebhook(wh)}
                                loading={testingWhId === wh.id}
                              >
                                <Zap className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" color="error" onClick={() => setConfirmDeleteWebhookId(wh.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="keys">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card variant="glass" className="lg:col-span-1 border-gray-800 h-fit">
                <CardBody className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-primary" />
                      Anahtarları Yönet
                    </h3>
                    <Button size="xs" onClick={() => setShowTokenModal(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Yeni
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Sistem uç noktalarına erişmek için kişisel erişim anahtarlarınızı buradan yönetebilirsiniz.
                  </p>
                  
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                      <Info className="w-4 h-4" />
                      Yönetici İpuçları
                    </div>
                    <ul className="text-[10px] text-gray-400 space-y-2 list-disc list-inside">
                      <li>Yüksek riskli işlemler için "Write" yetkisini sadece güvenilir anahtarlara verin.</li>
                      <li>Uzun süredir kullanılmayan anahtarları düzenli olarak silin.</li>
                      <li>Halka açık sunucular (Backend) için IP kısıtlaması eklemeniz şiddetle önerilir.</li>
                    </ul>
                  </div>
                </CardBody>
              </Card>

              <Card variant="elevated" className="lg:col-span-2 border-gray-800 bg-gray-900/40">
                <CardBody className="p-0">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-gray-800">
                        <TableHead>Anahtar Detayı</TableHead>
                        <TableHead>Maskeli Token</TableHead>
                        <TableHead>Kapsam & Güvenlik</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokensLoading ? (
                        <TableSkeleton rows={3} cols={4} />
                      ) : tokens.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-16 text-gray-500 italic">
                             Henüz bir API anahtarı üretilmemiş.
                          </TableCell>
                        </TableRow>
                      ) : tokens.map((token) => (
                        <TableRow key={token.id} className="border-gray-800 hover:bg-white/5 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-sm">{token.name}</span>
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                                <Clock className="w-3 h-3" />
                                {token.last_used_at ? `Son: ${new Date(token.last_used_at).toLocaleDateString('tr-TR')}` : 'Hiç kullanılmadı'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-[10px] bg-black/40 px-2 py-0.5 rounded border border-gray-800 text-gray-400">
                              {token.token_masked}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {token.scopes.map(s => (
                                <Badge key={s} variant="outline" className="text-[9px] uppercase border-gray-700">{s}</Badge>
                              ))}
                              {token.ip_restrictions?.length > 0 && (
                                <Badge color="primary" variant="solid" className="text-[9px] uppercase">
                                  <Globe className="w-2 h-2 mr-1" /> IP
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" color="error" onClick={() => setConfirmDeleteTokenId(token.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="catalog">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'Yevmiye Fişleri',
                  endpoint: '/api/accounting/journal-entries',
                  method: 'GET/POST',
                  desc: 'Accounting modülündeki tüm yevmiye kayıtlarını listeler veya yeni fiş oluşturur.',
                  category: 'Muhasebe'
                },
                {
                  title: 'Hesap Planı',
                  endpoint: '/api/accounting/chart-of-accounts',
                  method: 'GET',
                  desc: 'Tek düzen hesap planındaki tüm kodları ve hiyerarşiyi getirir.',
                  category: 'Muhasebe'
                },
                {
                  title: 'Mizan Raporu',
                  endpoint: '/api/financial/trial-balance',
                  method: 'GET',
                  desc: 'Dönemsel mizan verilerini, borç-alacak bakiye bilgilerini döndürür.',
                  category: 'Raporlama'
                },
                {
                  title: 'Stok Hareketleri',
                  endpoint: '/api/inventory/movements',
                  method: 'GET',
                  desc: 'Depo bazlı ham madde ve ürün çıkış/giriş kayıtlarını takip eder.',
                  category: 'Lojistik'
                },
                {
                  title: 'Personel Devam',
                  endpoint: '/api/hr/attendance/status',
                  method: 'GET',
                  desc: 'Çalışanların anlık giriş-çıkış ve vardiya durum bilgilerini döndürür.',
                  category: 'İK'
                },
                {
                  title: 'Üretim Emirleri',
                  endpoint: '/api/production/orders',
                  method: 'GET',
                  desc: 'Aktif hatlardaki üretim emirlerini ve aşamalarını listeler.',
                  category: 'Üretim'
                }
              ].map((api, idx) => (
                <ApiCard key={idx} api={api} copyToClipboard={copyToClipboard} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppDashboardLayout>
  )
}

function ApiCard({ api, copyToClipboard }: { api: any, copyToClipboard: (t: string) => void }) {
  const [snippetType, setSnippetType] = useState<'curl' | 'node'>('curl')
  
  const curlCode = `curl -X GET "https://erp.livasofa.com${api.endpoint}" \\
  -H "Authorization: Bearer [SENIN_TOKENIN]" \\
  -H "Content-Type: application/json"`

  const nodeCode = `const fetch = require('node-fetch');

fetch('https://erp.livasofa.com${api.endpoint}', {
  headers: {
    'Authorization': 'Bearer [SENIN_TOKENIN]',
    'Content-Type': 'application/json'
  }
}).then(res => res.json()).then(data => console.log(data));`

  return (
    <Card variant="glass" className="border-gray-800 hover:border-primary/40 transition-all flex flex-col h-full overflow-hidden group">
      <CardBody className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div className="space-y-1">
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{api.category}</span>
            <h4 className="font-black text-white uppercase text-sm">{api.title}</h4>
          </div>
          <Badge variant="solid" color={api.method.includes('POST') ? 'success' : 'primary'} className="text-[9px]">
            {api.method}
          </Badge>
        </div>
        
        <p className="text-[11px] text-gray-400 mb-4 leading-relaxed line-clamp-2">
          {api.desc}
        </p>

        <div className="mt-auto space-y-3">
          <div className="flex bg-black/40 rounded-t-lg border-x border-t border-gray-800 overflow-hidden">
            <button 
              onClick={() => setSnippetType('curl')}
              className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-tighter border-r border-gray-800 transition ${snippetType === 'curl' ? 'bg-primary/20 text-white' : 'text-gray-500 hover:bg-white/5'}`}
            >
              cURL
            </button>
            <button 
              onClick={() => setSnippetType('node')}
              className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-tighter transition ${snippetType === 'node' ? 'bg-primary/20 text-white' : 'text-gray-500 hover:bg-white/5'}`}
            >
              Node.js
            </button>
          </div>
          <div className="bg-black/80 rounded-b-lg p-3 font-mono text-[10px] text-blue-300 relative group/snippet">
            <pre className="overflow-x-auto whitespace-pre scrollbar-hide">
              {snippetType === 'curl' ? curlCode : nodeCode}
            </pre>
            <button 
              onClick={() => copyToClipboard(snippetType === 'curl' ? curlCode : nodeCode)}
              className="absolute top-2 right-2 opacity-0 group-hover/snippet:opacity-100 transition h-6 w-6 bg-gray-800 rounded flex items-center justify-center text-white"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
