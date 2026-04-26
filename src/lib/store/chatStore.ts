'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getSafeStorage } from '@/lib/store/safeStorage'

export interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string | Date
    related?: string[]
    insight?: string | { text: string; path?: string; action?: { label: string; type: string; data: any } }
    chartData?: { type: 'bar' | 'line' | 'pie'; data: any[] }
    executionResult?: { success: boolean; message: string }
}

interface ChatState {
    messages: Message[]
    isMuted: boolean
    addMessage: (message: Message) => void
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
    setIsMuted: (isMuted: boolean) => void
    clearChat: () => void
}

export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            messages: [],
            isMuted: false,
            addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
            setMessages: (messages) => set((state) => ({
                messages: typeof messages === 'function' ? messages(state.messages) : messages
            })),
            setIsMuted: (isMuted) => set({ isMuted }),
            clearChat: () => set({ messages: [] }),
        }),
        {
            name: 'furki-chat-history',
            storage: createJSONStorage(() => getSafeStorage()),
        }
    )
)
