'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export function CopilotFloatingButton({ standalone = true, onClose }: { standalone?: boolean; onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(standalone ? false : true)
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = () => {
    if (standalone) {
      setIsOpen(false)
    }
    if (onClose) onClose()
  }

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      })
      const data = await response.json()
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.content }])
      }
    } catch (error) {
      console.error('Copilot error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn(standalone ? "fixed bottom-8 right-8 z-[100]" : "absolute bottom-20 right-0 z-[100]")}>
      <AnimatePresence>
        {(standalone ? isOpen : true) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-96 h-[500px] glass rounded-[2.5rem] shadow-2xl border border-primary/20 overflow-hidden flex flex-col"
          >
            <div className="p-6 bg-primary/10 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-2xl">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm tracking-widest uppercase">Agi-Copilot</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Zenith Engine Active</span>
                  </div>
                </div>
              </div>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Sparkles className="w-10 h-10 text-primary" />
                  <p className="text-sm text-white italic">
                    Merhaba! Ben Agi-Copilot.<br/>Size nasıl yardım edebilirim?
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-[1.5rem] text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-br-none shadow-lg shadow-primary/20' 
                      : 'bg-white/5 border border-white/10 text-white/80 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-[1.5rem] rounded-bl-none">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-primary/10">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Bir şeyler sorun..."
                  className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-3 pl-4 pr-12 outline-none focus:border-primary/50 transition-all placeholder:text-white/20 text-sm"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary rounded-xl text-white hover:scale-105 transition-transform"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {standalone && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 bg-primary rounded-[2rem] shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center text-white border border-white/20 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary via-blue-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {isOpen ? <X className="w-6 h-6 relative z-10" /> : <Bot className="w-8 h-8 relative z-10" />}
          <div className="absolute -inset-2 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/40 transition-colors animate-pulse" />
        </motion.button>
      )}
    </div>
  )
}
