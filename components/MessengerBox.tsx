'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, User } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { formatDateTime } from '@/lib/utils/dateFormat'
import { useAuthStore } from '@/lib/store/authStore'
import { usePathname } from 'next/navigation'
import { toast } from '@/lib/notify'
import { playNotificationSound } from '@/lib/notify-sound'

type OnlineUser = { id: string; username: string; full_name: string | null }
type Message = {
  id: string
  from_user_id: string
  to_user_id: string
  body: string
  read_at: string | null
  created_at: string
  is_mine: boolean
}

const POLL_ONLINE_MS = 15000
const POLL_MESSAGES_MS = 5000
const POLL_LATEST_INCOMING_MS = 5000

function getDisplayName(u: OnlineUser): string {
  return u.full_name || u.username || u.id
}

export default function MessengerBox() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [online, setOnline] = useState<OnlineUser[]>([])
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevIncomingCountRef = useRef<number>(-1)
  const lastSeenLatestIncomingIdRef = useRef<string | null>(null)
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  // Arka planda gelen son mesajı kontrol et; yeni mesajda ses + masaüstü bildirimi (mesajlaşma kutusu kapalı veya liste görünümünde de çalışır)
  useEffect(() => {
    if (!user?.id) return
    let mounted = true
    type Latest = { id: string; from_name: string; body: string; created_at: string } | null
    const poll = async () => {
      try {
        const data = await fetchApi<Latest>('/api/messaging/latest-incoming')
        if (!mounted || !data?.id) return
        const prev = lastSeenLatestIncomingIdRef.current
        if (prev !== null && prev !== data.id) {
          playNotificationSound()
          const preview = data.body.length > 50 ? data.body.slice(0, 50) + '…' : data.body
          const desc = `${data.from_name}: ${preview}`
          toast.info('Yeni mesajınız var', desc)
          if (typeof window !== 'undefined' && 'Notification' in window) {
            const showDesktopNotif = () => {
              try {
                new Notification('Yeni mesajınız var', { body: desc, tag: 'msg-' + data.id })
              } catch {}
            }
            if (Notification.permission === 'granted') {
              showDesktopNotif()
            } else if (Notification.permission === 'default') {
              Notification.requestPermission().then((p) => {
                if (p === 'granted') showDesktopNotif()
              })
            }
          }
        }
        lastSeenLatestIncomingIdRef.current = data.id
      } catch {
        // ignore
      }
    }
    poll()
    const t = setInterval(poll, POLL_LATEST_INCOMING_MS)
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [user?.id])

  const loadOnline = useCallback(async () => {
    try {
      const list = await fetchApi<OnlineUser[]>('/api/messaging/online')
      setOnline(Array.isArray(list) ? list : [])
    } catch {
      setOnline([])
    }
  }, [])

  const loadMessages = useCallback(async () => {
    if (!selectedUser) return
    try {
      const list = await fetchApi<Message[]>(`/api/messaging/messages?with=${encodeURIComponent(selectedUser.id)}`)
      const arr = Array.isArray(list) ? list : []
      const incoming = arr.filter((m) => !m.is_mine)
      const incomingCount = incoming.length
      if (prevIncomingCountRef.current >= 0 && incomingCount > prevIncomingCountRef.current) {
        playNotificationSound()
        const lastMsg = incoming[incoming.length - 1]
        const preview = lastMsg?.body ? (lastMsg.body.length > 40 ? lastMsg.body.slice(0, 40) + '…' : lastMsg.body) : ''
        const desc = preview ? `${getDisplayName(selectedUser)}: ${preview}` : `${getDisplayName(selectedUser)} size mesaj gönderdi.`
        toast.info('Yeni mesajınız var', desc)
      }
      prevIncomingCountRef.current = incomingCount
      setMessages(arr)
      setTimeout(scrollToBottom, 100)
    } catch {
      setMessages([])
    }
  }, [selectedUser?.id])

  useEffect(() => {
    if (!open) return
    loadOnline()
    const t = setInterval(loadOnline, POLL_ONLINE_MS)
    return () => clearInterval(t)
  }, [open, loadOnline])

  useEffect(() => {
    if (!open || view !== 'chat' || !selectedUser) return
    loadMessages()
    const t = setInterval(loadMessages, POLL_MESSAGES_MS)
    return () => clearInterval(t)
  }, [open, view, selectedUser?.id, loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const isAuthPage = pathname === '/auth/login' || pathname === '/auth/register'
  if (!user || isAuthPage) return null

  const openChat = (u: OnlineUser) => {
    prevIncomingCountRef.current = -1
    setSelectedUser(u)
    setView('chat')
    setMessages([])
    setInput('')
  }

  const backToList = () => {
    prevIncomingCountRef.current = -1
    setView('list')
    setSelectedUser(null)
    setMessages([])
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !selectedUser || sending) return
    setSending(true)
    setInput('')
    try {
      await fetchApi('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user_id: selectedUser.id, body: text }),
      })
      await loadMessages()
    } catch {
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {})
          }
        }}
        className="fixed bottom-6 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl shadow-indigo-500/30 ring-2 ring-white/20 transition hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        aria-label="Mesajlaşma"
      >
        <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-[9999] flex w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-600/80 bg-slate-800/95 shadow-2xl backdrop-blur-sm"
          style={{ height: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between border-b border-slate-600/80 bg-gradient-to-r from-slate-700/90 to-slate-800/90 px-4 py-3.5">
            {view === 'chat' && selectedUser ? (
              <>
                <button
                  type="button"
                  onClick={backToList}
                  className="rounded-lg px-2 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-600/80 hover:text-white"
                  aria-label="Geri"
                >
                  ← Liste
                </button>
                <span className="font-semibold text-white">{getDisplayName(selectedUser)}</span>
                <span className="w-16" />
              </>
            ) : (
              <>
                <span className="font-semibold tracking-tight text-white">Mesajlaşma</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-600/80 hover:text-white"
                  aria-label="Kapat"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </>
            )}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden bg-slate-800/50">
            {view === 'list' && (
              <div className="flex-1 overflow-y-auto p-3">
                {online.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-700/80">
                      <User className="h-7 w-7 text-slate-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Çevrimiçi kullanıcı yok</p>
                    <p className="mt-1 text-xs text-slate-500">Biri giriş yaptığında burada görünecek</p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {online.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => openChat(u)}
                          className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition hover:bg-slate-700/80 active:scale-[0.99]"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/30">
                            <User className="h-6 w-6" strokeWidth={2} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-100">{getDisplayName(u)}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Çevrimiçi
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {view === 'chat' && selectedUser && (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((m) => {
                    const isMine = Boolean(m.is_mine)
                    return (
                    <div
                      key={m.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-md ${
                          isMine
                            ? 'rounded-br-md bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                            : 'rounded-bl-md bg-slate-700/90 text-slate-100 ring-1 ring-slate-600/50'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p>
                        <p className={`mt-1.5 text-xs ${isMine ? 'text-indigo-200/90' : 'text-slate-500'}`}>
                          {formatDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-slate-600/80 bg-slate-800/80 p-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      sendMessage()
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Mesaj yazın..."
                      className="flex-1 rounded-xl border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      maxLength={2000}
                    />
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 px-4 py-2.5 text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:shadow-none"
                    >
                      <Send className="h-5 w-5" strokeWidth={2} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
