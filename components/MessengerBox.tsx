'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, User } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { formatDateTime } from '@/lib/utils/dateFormat'
import { useAuthStore } from '@/lib/store/authStore'
import { usePathname } from 'next/navigation'

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
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const isAuthPage = pathname === '/auth/login' || pathname === '/auth/register'
  if (!user || isAuthPage) return null

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
      setMessages(Array.isArray(list) ? list : [])
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

  const openChat = (u: OnlineUser) => {
    setSelectedUser(u)
    setView('chat')
    setMessages([])
    setInput('')
  }

  const backToList = () => {
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

  const displayName = (u: OnlineUser) => u.full_name || u.username || u.id

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        aria-label="Mesajlaşma"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-[9999] flex w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-800 shadow-2xl"
          style={{ height: '420px' }}
        >
          <div className="flex items-center justify-between border-b border-slate-600 bg-slate-700/80 px-4 py-3">
            {view === 'chat' && selectedUser ? (
              <>
                <button
                  type="button"
                  onClick={backToList}
                  className="text-slate-300 hover:text-white"
                  aria-label="Geri"
                >
                  ← Liste
                </button>
                <span className="font-medium text-white">{displayName(selectedUser)}</span>
                <span className="w-12" />
              </>
            ) : (
              <>
                <span className="font-medium text-white">Mesajlaşma</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-600 hover:text-white"
                  aria-label="Kapat"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {view === 'list' && (
              <div className="flex-1 overflow-y-auto p-2">
                {online.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Çevrimiçi kullanıcı yok</p>
                ) : (
                  <ul className="space-y-1">
                    {online.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => openChat(u)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-700"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/80 text-white">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-100">{displayName(u)}</p>
                            <p className="text-xs text-green-400">Çevrimiçi</p>
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
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          m.is_mine
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-600 text-slate-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                        <p className={`mt-1 text-xs ${m.is_mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {formatDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-slate-600 p-2">
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
                      className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      maxLength={2000}
                    />
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Send className="h-5 w-5" />
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
