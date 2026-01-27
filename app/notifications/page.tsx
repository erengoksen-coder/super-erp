'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, Send } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { getUserId } from '@/lib/auth'

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
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

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

  async function subscribe() {
    if (!supported) return
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/vapid-public-key')
      if (!response.ok) throw new Error('VAPID anahtarı alınamadı')
      const { publicKey } = await response.json()

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const userId = getUserId()
      const saveResponse = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, user_id: userId }),
      })
      if (!saveResponse.ok) throw new Error('Abonelik kaydedilemedi')

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
      await fetch('/api/notifications/unsubscribe', {
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
      const response = await fetch('/api/notifications/test', { method: 'POST' })
      if (!response.ok) throw new Error('Bildirim gönderilemedi')
      const data = await response.json()
      alert(`Test bildirimi gönderildi. Basarili: ${data.sent || 0}`)
    } catch (error: any) {
      alert(error.message || 'Test bildirimi gönderilemedi')
    } finally {
      setLoading(false)
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
    </div>
  )
}
