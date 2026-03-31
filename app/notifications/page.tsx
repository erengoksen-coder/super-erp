'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { 
  Bell, 
  BellOff, 
  Send, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  History, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  LayoutGrid, 
  ArrowRight,
  MoreHorizontal,
  Info
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { usePreferencesStore } from '@/lib/store/preferencesStore'
import { fetchApi, useApi } from '@/lib/api/client'
import { subscribeToTable } from '@/lib/supabase/realtime'
import { toast } from '@/lib/notify'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function NotificationsPage() {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const { notificationSound, setNotificationSound } = usePreferencesStore()
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)

  type NotificationItem = { id: string; title: string; message: string; type?: string; read?: number; created_at: string }
  const { data: notificationsList = [], mutate: mutateNotifications } = useApi<NotificationItem[]>('/api/notifications')

  async function markNotificationRead(id: string) {
    try {
      await fetchApi(`/api/notifications/${id}/read`, { method: 'PATCH' })
      await mutateNotifications()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'İşlem başarısız')
    }
  }

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setSupported(isSupported)
    if (typeof window !== 'undefined') {
      setPermission(Notification.permission)
    }
  }, [])

  const statusLabel = useMemo(() => {
    if (!supported) return 'TARAYICI DESTEKLEMİYOR'
    if (permission === 'denied') return 'İZİN REDDEDİLDİ'
    if (!subscribed) return 'BİLDİRİMLER PASİF'
    return 'BİLDİRİMLER AKTİF'
  }, [supported, permission, subscribed])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator)) return
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    setSubscribed(Boolean(subscription))
  }

  useEffect(() => {
    if (supported) {
      checkSubscription()
    }
  }, [supported])

  const loadAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true)
      const data = await fetchApi<any[]>('/api/stock-alerts?status=open')
      setAlerts(data)
    } catch (error: any) {
      // ignore
    } finally {
      setAlertsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()

    let unsubscribe: (() => void) | null = null
    let intervalId: number | null = null

    const startRealtime = () => {
      const cleanup = subscribeToTable('stock_alerts', () => {
        loadAlerts()
      })
      if (cleanup) {
        unsubscribe = cleanup
        return
      }
      intervalId = window.setInterval(() => {
        loadAlerts()
      }, 30_000)
    }

    if (typeof window !== 'undefined') {
      startRealtime()
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [loadAlerts])

  async function subscribe() {
    if (!supported) return
    setLoading(true)
    try {
      const { publicKey } = await fetchApi<{ publicKey: string }>('/api/notifications/vapid-public-key')

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      await fetchApi('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, user_id: userId }),
      })

      setSubscribed(true)
      setPermission(Notification.permission)
      toast.success('Bildirim aboneliği başarıyla oluşturuldu')
    } catch (error: any) {
      toast.error(error.message || 'Bildirim aboneliği oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    if (!supported) return
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        setSubscribed(false)
        return
      }
      await subscription.unsubscribe()
      await fetchApi('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      setSubscribed(false)
      toast.success('Abonelik kaldırıldı')
    } catch (error: any) {
      toast.error(error.message || 'Abonelik kaldırılamadı')
    } finally {
      setLoading(false)
    }
  }

  async function sendTest() {
    setLoading(true)
    try {
      const data = await fetchApi<{ sent?: number }>('/api/notifications/test', { method: 'POST' })
      toast.success(`Test bildirimi yönlendirildi. Başarılı: ${data.sent || 0}`)
    } catch (error: any) {
      toast.error(error.message || 'Test bildirimi gönderilemedi')
    } finally {
      setLoading(false)
    }
  }

  async function resolveAlert(id: string) {
    try {
      await fetchApi('/api/stock-alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      loadAlerts()
      toast.success('Stok uyarısı çözüldü olarak işaretlendi')
    } catch (error: any) {
      toast.error(error.message || 'Uyarı kapatılamadı')
    }
  }

  return (
    <AppDashboardLayout
      title="Bildirim & İletişim"
      subtitle="Tarayıcı push mesajları ve sistem kritik uyarıları"
      icon={Bell}
    >
      <div className="space-y-8 animate-reveal">
         {/* Push Subscription Card */}
         <Card variant="glass" className="border-white/5 overflow-hidden group">
            <CardHeader className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/20 group-hover:scale-110 transition-transform shadow-glow shadow-primary/20">
                     <Zap className="w-8 h-8 shadow-glow shadow-primary/40" />
                  </div>
                  <div>
                     <h2 className="text-xl font-black uppercase tracking-tight">Anlık Tarayıcı Bildirimleri</h2>
                     <p className="text-[10px] font-bold text-foreground/30 uppercase mt-1 tracking-widest italic">{statusLabel}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <Badge variant="soft" color={subscribed ? 'success' : 'secondary'} className="text-[10px] font-black px-4 h-9 tracking-widest uppercase">
                     {subscribed ? 'BAĞLI' : 'BAĞLI DEĞİL'}
                  </Badge>
               </div>
            </CardHeader>
            <CardBody className="p-10 space-y-8">
               <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-4">
                  <Info className="w-5 h-5 text-primary opacity-40 shadow-glow" />
                  <p className="text-[11px] font-medium text-foreground/40 leading-relaxed uppercase tracking-tighter italic">
                     Yeni giriş gerçekleştiğinde veya stok seviyeleri kritik limitlere ulaştığında tarayıcınıza anlık mesaj ulaştırılır. Aktifleştirmek için aşağıdaki butonları kullanın.
                  </p>
               </div>

               <div className="flex flex-wrap gap-4">
                  <Button 
                     onClick={subscribe}
                     disabled={!supported || loading || permission === 'denied'}
                     color="primary"
                     className="px-8 h-12 rounded-2xl font-black uppercase tracking-widest italic shadow-lg shadow-primary/20"
                  >
                     <Bell className="w-4 h-4 mr-3" /> BİLDİRİMLERİ AKTİF ET
                  </Button>
                  
                  <Button 
                     onClick={unsubscribe}
                     disabled={!supported || loading || !subscribed}
                     variant="soft"
                     color="secondary"
                     className="px-8 h-12 rounded-2xl font-black uppercase tracking-widest italic"
                  >
                     <BellOff className="w-4 h-4 mr-3" /> ABONELİĞİ DURDUR
                  </Button>

                  <Button 
                     onClick={() => setNotificationSound(!notificationSound)}
                     variant="glass"
                     className="px-8 h-12 rounded-2xl font-black uppercase tracking-widest italic bg-white/5 border-white/5"
                  >
                     {notificationSound ? <Volume2 className="w-4 h-4 mr-3 text-success" /> : <VolumeX className="w-4 h-4 mr-3 text-error" />}
                     SESLİ UYARI: {notificationSound ? 'AÇIK' : 'KAPALI'}
                  </Button>

                  <Button 
                     onClick={sendTest}
                     disabled={!supported || loading || !subscribed}
                     variant="ghost"
                     className="ml-auto px-8 h-12 rounded-2xl font-black uppercase tracking-widest italic text-primary hover:bg-primary/5"
                  >
                     <Send className="w-4 h-4 mr-3" /> TEST PİNGİ GÖNDER
                  </Button>
               </div>
            </CardBody>
         </Card>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Notification History */}
            <Card variant="glass" className="border-white/5 overflow-hidden">
               <CardHeader className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <History className="w-5 h-5 text-primary" />
                     <h2 className="text-xs font-black uppercase tracking-widest text-foreground/80">Bildirim Geçmişi</h2>
                  </div>
                  <Badge variant="glass" className="text-[8px] font-black bg-white/5 border-white/5">{notificationsList.length} KAYIT</Badge>
               </CardHeader>
               <CardBody className="p-4">
                  {notificationsList.length === 0 ? (
                     <div className="py-24 flex flex-col items-center justify-center opacity-10">
                        <LayoutGrid className="w-12 h-12 mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">Kayıt Bulunmuyor</p>
                     </div>
                  ) : (
                     <div className="space-y-3">
                        {notificationsList.map((n) => (
                           <div
                              key={n.id}
                              className={cn(
                                 'group flex items-start justify-between gap-6 p-5 rounded-[2.5rem] bg-white/[0.02] border border-white/5 transition-all',
                                 !n.read && 'bg-primary/[0.03] border-primary/20'
                              )}
                           >
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                 <div className={cn("p-3 rounded-xl transition-all group-hover:scale-110 shadow-glow-sm", n.read ? "bg-white/5 text-foreground/20" : "bg-primary/20 text-primary")}>
                                    <Bell className="w-5 h-5 shadow-glow" />
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight">{n.title || 'Sistem Mesajı'}</p>
                                    <p className="text-[11px] font-medium text-foreground/40 leading-relaxed uppercase tracking-tighter italic mt-1">{n.message}</p>
                                    <p className="text-[9px] font-black text-foreground/20 mt-2 uppercase tracking-widest font-mono">{new Date(n.created_at).toLocaleString('tr-TR')}</p>
                                 </div>
                              </div>
                              {!n.read && (
                                 <Button 
                                    onClick={() => markNotificationRead(n.id)} 
                                    variant="soft" 
                                    size="xs" 
                                    color="primary" 
                                    className="text-[8px] font-black px-4 h-8 rounded-xl shrink-0"
                                 >
                                    OKUNDU
                                 </Button>
                              )}
                           </div>
                        ))}
                     </div>
                  )}
               </CardBody>
            </Card>

            {/* Critical Stock Alerts */}
            <Card variant="glass" className="border-white/5 overflow-hidden">
               <CardHeader className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <AlertTriangle className="w-5 h-5 text-error shadow-glow shadow-error/40" />
                     <h2 className="text-xs font-black uppercase tracking-widest text-foreground/80">Kritik Stok Alermleri</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={loadAlerts} className="rounded-xl"><RefreshCw className={cn("w-4 h-4", alertsLoading && "animate-spin")} /></Button>
               </CardHeader>
               <CardBody className="p-6">
                  {alertsLoading ? (
                     <div className="py-24 flex flex-col items-center justify-center opacity-40">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Taranıyor</p>
                     </div>
                  ) : alerts.length === 0 ? (
                     <div className="py-24 flex flex-col items-center justify-center opacity-10">
                        <CheckCircle2 className="w-12 h-12 mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-success">Kritik Stok Bulunmamaktadır</p>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        {alerts.map((alert) => (
                           <div key={alert.id} className="p-6 rounded-[2.5rem] bg-error/[0.02] border border-error/10 hover:bg-error/[0.04] transition-all group flex items-start justify-between gap-6">
                              <div className="flex items-start gap-4">
                                 <div className="p-3 bg-error/10 rounded-2xl text-error group-hover:scale-110 transition-transform shadow-glow shadow-error/40">
                                    <AlertTriangle className="w-6 h-6 shadow-glow" />
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-black text-error italic uppercase tracking-tight">{alert.material_name}</span>
                                    {alert.material_code && <span className="text-[9px] font-mono font-bold opacity-40 uppercase">KOD: {alert.material_code}</span>}
                                    <p className="text-[10px] font-medium text-foreground/40 mt-1 uppercase tracking-tighter leading-relaxed italic">{alert.message}</p>
                                 </div>
                              </div>
                              <Button 
                                 onClick={() => resolveAlert(alert.id)} 
                                 size="xs" 
                                 color="error" 
                                 variant="soft" 
                                 className="text-[8px] font-black px-4 h-9 rounded-xl shadow-glow-sm shadow-error/10"
                              >
                                 ÇÖZÜLDÜ
                              </Button>
                           </div>
                        ))}
                     </div>
                  )}
               </CardBody>
            </Card>
         </div>

         {/* Info Footer */}
         <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center gap-6 group">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-glow shadow-primary/20">
               <ShieldCheck className="w-8 h-8 shadow-glow shadow-primary/40" />
            </div>
            <div>
               <h4 className="text-xs font-black uppercase tracking-widest text-foreground/80 mb-1">Güvenli Bildirim Kanalı</h4>
               <p className="text-[10px] font-medium text-foreground/20 leading-relaxed uppercase tracking-[0.1em] italic">
                  Tüm bildirimler VAPID standartlarında şifrelenmiştir. Web push servisleri sadece tarayıcı açık olduğu durumlarda mesaj iletir.
               </p>
            </div>
         </div>
      </div>
    </AppDashboardLayout>
  )
}
