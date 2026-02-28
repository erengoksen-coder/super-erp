'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, X, Bot, Sparkles, ChevronRight, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchApi } from '@/lib/api/client'
import { cn } from '@/lib/cn'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    related?: string[]
}

export default function AiChatbot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Merhaba! Ben Furki, Super ERP Yapay Zeka Asistanı. Programın kullanımı, modüller veya süreçler hakkında her türlü sorunuzu sorabilirsiniz. Size nasıl yardımcı olabilirim?',
            timestamp: new Date(),
            related: ['Sipariş nasıl girilir?', 'Üretim nasıl başlatılır?', 'Kritik stok nedir?']
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isOpen])

    const handleSendMessage = async (msgText: string) => {
        if (!msgText.trim() || loading) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: msgText,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            const res = await fetchApi<any>('/api/ai/chat', {
                method: 'POST',
                body: JSON.stringify({ message: msgText })
            })

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.answer,
                timestamp: new Date(),
                related: res.related
            }

            setMessages(prev => [...prev, aiMsg])
        } catch (err: any) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Üzgünüm, şu an bağlantı kuramıyorum. Lütfen daha sonra tekrar deneyin.',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Floating Button */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isOpen ? 0 : 1, opacity: isOpen ? 0 : 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-500/40 flex items-center justify-center border border-white/20 group overflow-hidden"
            >
                <div className="absolute inset-0 bg-blue-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <motion.div
                    animate={{
                        rotate: [0, 5, -5, 0],
                        y: [0, -2, 2, 0]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 4,
                        ease: "easeInOut"
                    }}
                >
                    <Sparkles className="w-8 h-8 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                </motion.div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500 border border-sky-400"></span>
                </span>
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.8, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 100, scale: 0.8, filter: 'blur(10px)' }}
                        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                        className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] max-h-[85vh] flex flex-col bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-blue-600/20 border-b border-white/10 flex items-center justify-between relative overflow-hidden">
                            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                                        <Bot className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white tracking-tight">Furki</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-bold text-blue-300/60 uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">Asistan Modu</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2.5 rounded-xl hover:bg-white/10 text-slate-400 transition-all hover:text-white active:scale-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth scrollbar-none"
                        >
                            {messages.map((msg) => (
                                <motion.div
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={msg.id}
                                    className={cn(
                                        "flex flex-col max-w-[88%]",
                                        msg.role === 'user' ? "ml-auto" : "mr-auto"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-xl",
                                            msg.role === 'user'
                                                ? "bg-blue-600 text-white rounded-tr-none border border-blue-400/30"
                                                : "bg-slate-900/50 text-slate-200 border border-white/10 rounded-tl-none backdrop-blur-md"
                                        )}
                                    >
                                        {msg.content}
                                    </div>

                                    {/* Related Questions */}
                                    {msg.role === 'assistant' && msg.related && msg.related.length > 0 && (
                                        <div className="mt-4 flex flex-col gap-2">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 px-1">Önerilen Başlıklar</p>
                                            {msg.related.map((q, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSendMessage(q)}
                                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/40 text-[12px] font-bold text-blue-400/80 transition-all flex items-center justify-between group"
                                                >
                                                    <span className="line-clamp-1">{q}</span>
                                                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <span className="text-[10px] text-slate-500 mt-2 font-bold px-1 opacity-60">
                                        {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </motion.div>
                            ))}

                            {loading && (
                                <div className="flex gap-2 p-4 bg-slate-900/50 border border-white/10 rounded-2xl rounded-tl-none w-20 backdrop-blur-md">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-white/10 bg-slate-950/80 backdrop-blur-3xl">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
                                className="relative"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Soru sorabilirsiniz..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-[13px] text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600 font-bold"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="absolute right-2.5 top-2.5 p-2.5 rounded-xl bg-blue-600 text-white shadow-xl shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-30 transition-all active:scale-90 group"
                                >
                                    <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </button>
                            </form>
                            <div className="flex items-center justify-center gap-4 mt-4 opacity-30 grayscale hover:grayscale-0 transition-all">
                                <div className="h-px w-8 bg-slate-700" />
                                <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase">
                                    Furki AI Engine
                                </p>
                                <div className="h-px w-8 bg-slate-700" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
