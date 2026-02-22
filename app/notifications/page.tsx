'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff, Send, AlertTriangle, Volume2, VolumeX } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { useAuthStore } from '@/lib/store/authStore'
import { usePreferencesStore } from '@/lib/store/preferencesStore'
import useSWRConfig from 'swr'
import { fetchApi, useApi } from '@/lib/api/client'
import { subscribeToTable } from '@/lib/supabase/realtime'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'
import { EmptyState } from '@/components/ui/EmptyState'

function getNotificationHref(refType: string | null | undefined, refId: string | null | undefined): string | null {
  if (!refType) return null
  switch (refType) {
    case 'purchase_request':
      return refId ? `/purchase-requests?highlight=${encodeURIComponent(refId)}` : '/purchase-requests'
    case 'shipment':
      return refId ? `/shipments/${refId}` : '/shipments'
    case 'bayi_order':
      return '/orders'
    default:
      return null
  }
}

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
  const { notificationSound, setNotificationSound, notificationTypes = {}, setNotificationType } = usePreferencesStore()
  const types = {
    criticalStock: notificationTypes.criticalStock ?? true,
    shipmentApproved: notificationTypes.shipmentApproved ?? true,
    newOrder: notificationTypes.newOrder ?? true,
    orderStatusChange: notificationTypes.orderStatusChange ?? false,
    purchaseRequest: notificationTypes.purchaseRequest ?? true,
  }

  useEffect(() => { document.title = 'Bildirimler - LIVASOFA ERP'; return () => { document.title = 'LIVASOFA ERP' } }, [])

  const setTypeAndSync = useCallback((key: keyof typeof types, value: boolean) => {
    setNotificationType(key, value)
    const next = { ...types, [key]: value }
    fetchApi('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        criticalStock: next.criticalStock,
        shipmentApproved: next.shipmentApproved,
        newOrder: next.newOrder,
        orderStatusChange: next.orderStatusChange,
        purchaseRequest: next.purchaseRequest,
      }),
    }).catch(() => {})
  }, [types, setNotificationType])

  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)

  type NotificationItem = { id: string; title: string; message: string; type?: string; read?: number; created_at: string; reference_type?: string | null; reference_id?: string | null }
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { data: notificationsList = [], mutate: mutateNotifications } = useApi<NotificationItem[]>('/api/notifications')

  async function markNotificationRead(id: string) {
    try {
      await fetchApi(`/api/notifications/${id}/read`, { method: 'PATCH' })
      await mutateNotifications()
      await mutate('/api/notifications/unread-count')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'İşlem başarısız')
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasNotification = typeof window.Notification !== 'undefined'
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      hasNotification
    setSupported(isSupported)
    if (hasNotification) {
      setPermission(window.Notification.permission)
    }
  }, [])

  const statusLabel = useMemo(() => {
    if (!supported) return 'Tarayıcı desteklemiyor'
    if (permission === 'denied') return 'Bildirim izni reddedildi'
    if (!subscribed) return 'Bildirimler kapalı'
    return 'Bildirimler açık'
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
      if (typeof window !== 'undefined' && typeof window.Notification !== 'undefined') {
        setPermission(window.Notification.permission)
      }
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
      toast.success(`Test bildirimi gönderildi. Başarılı: ${data.sent || 0}`)
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
    } catch (error: any) {
      toast.error(error.message || 'Uyarı kapatılamadı')
    }
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-white">Bildirimler</h1>
        <div className="shrink-0 h-20 w-auto max-w-[200px] flex items-center justify-center">
          <LogoWithBackground size="sm" className="!h-20 !w-auto !max-h-20 object-contain" />
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 space-y-4">
        <p className="text-gray-400">{statusLabel}</p>

        <p className="text-sm text-gray-300">
          Yeni giriş yaptığınızda ve anlık bildirim geldiğinde mesaj ekranda (sağ üst) görünür. Bildirimleri açıp sesli uyarıyı etkinleştirirseniz ses de çalar.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={subscribe}
            disabled={!supported || loading || permission === 'denied'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 disabled:opacity-60"
            type="button"
          >
            <Bell size={18} />
            <span>Bildirimleri Aç</span>
          </button>

          <button
            onClick={unsubscribe}
            disabled={!supported || loading || !subscribed}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition inline-flex items-center space-x-2 disabled:opacity-60"
            type="button"
          >
            <BellOff size={18} />
            <span>Bildirimleri Kapat</span>
          </button>

          <button
            onClick={() => setNotificationSound(!notificationSound)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition inline-flex items-center space-x-2"
            type="button"
          >
            {notificationSound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>Sesli Uyarı {notificationSound ? 'Açık' : 'Kapalı'}</span>
          </button>

          <button
            onClick={sendTest}
            disabled={!supported || loading || !subscribed}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2 disabled:opacity-60"
            type="button"
          >
            <Send size={18} />
            <span>Test Bildirimi</span>
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Hangi bildirimleri almak istiyorsunuz?</h3>
          <p className="text-xs text-gray-500 mb-3">Seçtiğiniz türlerdeki olaylarda bildirim alırsınız (sunucu desteklediğinde uygulanır).</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={types.criticalStock}
                onChange={(e) => setTypeAndSync('criticalStock', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Kritik stok uyarısı</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={types.shipmentApproved}
                onChange={(e) => setTypeAndSync('shipmentApproved', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Sevkiyat onayı</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={types.newOrder}
                onChange={(e) => setTypeAndSync('newOrder', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Yeni sipariş</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={types.orderStatusChange}
                onChange={(e) => setTypeAndSync('orderStatusChange', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Sipariş durum değişikliği</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={types.purchaseRequest}
                onChange={(e) => setTypeAndSync('purchaseRequest', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Yeni satın alma talebi</span>
            </label>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Not: Bildirimler için VAPID anahtarlarının ortam değişkenlerinde tanımlı olması gerekir.
        </p>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Bildirim geçmişi</h2>
        {notificationsList.length === 0 ? (
          <EmptyState
            title="Henüz bildirim yok"
            description="Bildirimler burada listelenir."
            icon={Bell}
          />
        ) : (
          <ul className="space-y-2">
            {notificationsList.map((n) => {
              const href = getNotificationHref(n.reference_type, n.reference_id)
              return (
                <li
                  key={n.id}
                  role={href ? 'button' : undefined}
                  tabIndex={href ? 0 : undefined}
                  onClick={href ? () => router.push(href) : undefined}
                  onKeyDown={href ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(href) } } : undefined}
                  className={cn(
                    'flex items-start justify-between gap-3 rounded-lg px-4 py-3 border',
                    n.read ? 'bg-gray-800/50 border-gray-800 text-gray-400' : 'bg-gray-800 border-gray-700 text-white',
                    href && 'cursor-pointer hover:bg-gray-750 transition-colors'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{n.title || 'Bildirim'}</div>
                    {n.message && <div className="text-sm mt-0.5 opacity-90">{n.message}</div>}
                    <div className="text-xs mt-1 opacity-60">{new Date(n.created_at).toLocaleString('tr-TR')}</div>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); markNotificationRead(n.id) }}
                      className="shrink-0 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
                    >
                      Okundu işaretle
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Kritik Stok Uyarıları</h2>
          </div>
          <button
            onClick={loadAlerts}
            className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition text-sm"
          >
            Yenile
          </button>
        </div>

        {alertsLoading ? (
          <div className="text-center py-6 text-gray-400">Yükleniyor...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-6 text-gray-400">Açık uyarı yok</div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between bg-gray-800 rounded px-4 py-3">
                <div className="text-sm text-white">
                  <span className="font-semibold">{alert.material_name}</span>
                  {alert.material_code ? ` (${alert.material_code})` : ''} - {alert.message}
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-xs"
                >
                  Kapat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
