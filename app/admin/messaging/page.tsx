'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { formatDateTime } from '@/lib/utils/dateFormat'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { EmptyState } from '@/components/ui/EmptyState'

type Conversation = {
  user_a_id: string
  user_b_id: string
  user_a_name: string
  user_b_name: string
  last_message_at: string
  last_message_preview: string
}

type AdminMessage = {
  id: string
  from_user_id: string
  to_user_id: string
  from_name: string
  body: string
  read_at: string | null
  created_at: string
}

const POLL_MS = 5000

export default function AdminMessagingPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<{ userA: string; userB: string; nameA: string; nameB: string } | null>(null)
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const isAdmin = isAdminRole(user?.role)

  useEffect(() => {
    if (!user) return
    if (!isAdmin) {
      const t = setTimeout(() => router.replace('/'), 0)
      return () => clearTimeout(t)
    }
    loadConversations()
  }, [user, isAdmin, router])

  useEffect(() => {
    if (!selected) return
    loadMessages()
    const t = setInterval(loadMessages, POLL_MS)
    return () => clearInterval(t)
  }, [selected?.userA, selected?.userB])

  async function loadConversations() {
    setLoading(true)
    try {
      const list = await fetchApi<Conversation[]>('/api/admin/messaging/conversations')
      setConversations(Array.isArray(list) ? list : [])
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages() {
    if (!selected) return
    setMessagesLoading(true)
    try {
      const list = await fetchApi<AdminMessage[]>(
        `/api/admin/messaging/messages?user_a=${encodeURIComponent(selected.userA)}&user_b=${encodeURIComponent(selected.userB)}`
      )
      setMessages(Array.isArray(list) ? list : [])
    } catch {
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }

  if (!user) return null
  if (!isAdmin) return null

  return (
    <AppDashboardLayout
      title="Mesajlaşma (Admin)"
      subtitle="Kullanıcılar arası mesajları canlı ve geçmiş olarak görüntüleme"
      icon={MessageCircle}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader
            title="Konuşmalar"
            actions={
              <Button variant="ghost" size="sm" onClick={loadConversations} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            }
          />
          <CardBody className="p-0">
            {loading ? (
              <div className="p-4 text-slate-400">Yükleniyor...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Henüz konuşma yok"
                  description="Kullanıcılar arası mesajlaşma burada listelenir."
                  icon={MessageCircle}
                />
              </div>
            ) : (
              <div ref={listRef} className="max-h-[480px] overflow-y-auto">
                {conversations.map((c) => {
                  const key = [c.user_a_id, c.user_b_id].sort().join('|')
                  const isSelected =
                    selected?.userA === c.user_a_id && selected?.userB === c.user_b_id
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setSelected({
                          userA: c.user_a_id,
                          userB: c.user_b_id,
                          nameA: c.user_a_name,
                          nameB: c.user_b_name,
                        })
                      }
                      className={`w-full border-b border-slate-600/50 px-4 py-3 text-left transition ${
                        isSelected ? 'bg-slate-700' : 'hover:bg-slate-700/50'
                      }`}
                    >
                      <p className="font-medium text-slate-100">
                        {c.user_a_name} ↔ {c.user_b_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {c.last_message_preview || '—'}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(c.last_message_at)}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          {selected ? (
            <>
              <CardHeader
                title={`${selected.nameA} ↔ ${selected.nameB}`}
                subtitle="Canlı + geçmiş mesajlar"
                actions={
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Liste
                  </Button>
                }
              />
              <CardBody>
                {messagesLoading && messages.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">Yükleniyor...</div>
                ) : messages.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">Mesaj yok.</div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-lg px-3 py-2 ${
                          m.from_user_id === selected.userA
                            ? 'bg-slate-700 ml-0 mr-8'
                            : 'bg-indigo-900/40 mr-0 ml-8'
                        }`}
                      >
                        <p className="text-xs font-medium text-slate-400">{m.from_name}</p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-slate-100">
                          {m.body}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(m.created_at)}
                          {m.read_at ? ` · Okundu: ${formatDateTime(m.read_at)}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Bu görünüm {POLL_MS / 1000} saniyede bir güncellenir (canlı).
                </p>
              </CardBody>
            </>
          ) : (
            <CardBody>
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                <p>Görüntülemek için soldan bir konuşma seçin.</p>
              </div>
            </CardBody>
          )}
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
