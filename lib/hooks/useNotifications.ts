'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useNotifications(
  userId: string,
  options?: { onNotify?: (notification: any) => void }
) {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<any[]>([])

  const loadNotifications = useCallback(async () => {
    if (!supabase) {
      return
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data)
    }
  }, [userId])

  useEffect(() => {
    if (!userId || !supabase) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: unknown }) => {
          const notification = payload.new
          options?.onNotify?.(notification)
          setNotifications((prev) => [notification, ...prev])
        }
      )
      .subscribe()

    loadNotifications()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, loadNotifications, options?.onNotify])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      )
    },
    [setNotifications]
  )

  const markAllAsRead = useCallback(async () => {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false)

    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }, [userId])

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    markAsRead,
    markAllAsRead,
  }
}
