'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, Send, AlertTriangle } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api/client'

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
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)

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

  async function loadAlerts() {
    try {
      setAlertsLoading(true)
      const data = await fetchApi<any[]>('/api/stock-alerts?status=open')
      setAlerts(data)
    } catch (error: any) {
      // ignore
    } finally {
      setAlertsLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

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
    } catch (error: any) {
      alert(error.message || 'Bildirim aboneliği oluşturulamadı')
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
      alert(error.message || 'Abonelik kaldırılamadı')
    } finally {
      setLoading(false)
    }
  }

  async function sendTest() {
    setLoading(true)
    try {
      const data = await fetchApi<{ sent?: number }>('/api/notifications/test', { method: 'POST' })
      alert(`Test bildirimi gönderildi. Basarili: ${data.sent || 0}`)
    } catch (error: any) {
      alert(error.message || 'Test bildirimi gönderilemedi')
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
      alert(error.message || 'Uyarı kapatılamadı')
    }
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center space-x-4 mb-6">
        <h1 className="text-3xl font-bold text-white">Bildirimler</h1>
        <LogoWithBackground size="sm" />
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 space-y-4">
        <p className="text-gray-400">{statusLabel}</p>

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
            onClick={sendTest}
            disabled={!supported || loading || !subscribed}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition inline-flex items-center space-x-2 disabled:opacity-60"
            type="button"
          >
            <Send size={18} />
            <span>Test Bildirimi</span>
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Not: Bildirimler için VAPID anahtarlarının ortam değişkenlerinde tanımlı olması gerekir.
        </p>
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
