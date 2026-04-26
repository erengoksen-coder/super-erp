'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, MessageCircle, X, Sparkles, Zap, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/cn'
import { agiAudio } from '@/lib/utils/audio'

// Components
import MessengerBox from '@/components/MessengerBox'
import AiChatbot from '@/components/ui/AiChatbot'
import { CopilotFloatingButton } from '@/components/ai/CopilotFloatingButton'

/**
 * Zenith Floating Hub
 * Modern, unified floating action center for Zenith 2026.
 * Consolidates AI, Messaging, and Support into a single organized experience.
 */
export function ZenithFloatingHub() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'agi' | 'furki' | 'messenger' | null>(null)

  const toggleHub = () => {
    setIsOpen(!isOpen)
    if (!isOpen) agiAudio.playClick()
  }

  const handleToolClick = (tool: 'agi' | 'furki' | 'messenger') => {
    setActiveTool(activeTool === tool ? null : tool)
    agiAudio.playBlip()
  }

  const closeTool = () => setActiveTool(null)

  return (
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end gap-4">
      {/* Tool Windows Overlay */}
      <AnimatePresence mode="wait">
        {activeTool === 'messenger' && (
          <motion.div 
            key="messenger"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="absolute bottom-20 right-0"
          >
             <MessengerBox standalone={false} onClose={closeTool} />
          </motion.div>
        )}
        {activeTool === 'furki' && (
          <motion.div 
            key="furki"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="absolute bottom-20 right-0"
          >
             <AiChatbot standalone={false} onClose={closeTool} />
          </motion.div>
        )}
        {activeTool === 'agi' && (
          <motion.div 
            key="agi"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="absolute bottom-20 right-0"
          >
             <CopilotFloatingButton standalone={false} onClose={closeTool} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hub Menu - Staggered Buttons */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-3 mb-2"
          >
            {/* Agi Copilot Button */}
            <motion.button
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleToolClick('agi')}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border shadow-lg group relative",
                activeTool === 'agi' 
                  ? "bg-primary border-primary shadow-primary/40 text-white" 
                  : "bg-slate-900/80 backdrop-blur-xl border-white/10 text-white/60 hover:text-white hover:border-primary/50 shadow-black/40"
              )}
            >
              <Bot className="w-6 h-6" />
              <div className="absolute right-full mr-4 px-3 py-1.5 rounded-xl bg-slate-900/90 text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/5">
                 AGİ-COPİLOT
              </div>
            </motion.button>

            {/* Furki AI Button */}
            <motion.button
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleToolClick('furki')}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border shadow-lg group relative",
                activeTool === 'furki' 
                  ? "bg-blue-600 border-blue-500 shadow-blue-500/40 text-white" 
                  : "bg-slate-900/80 backdrop-blur-xl border-white/10 text-white/60 hover:text-white hover:border-blue-500/50 shadow-black/40"
              )}
            >
              <Sparkles className="w-6 h-6" />
              <div className="absolute right-full mr-4 px-3 py-1.5 rounded-xl bg-slate-900/90 text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/5">
                 FURKİ AI
              </div>
            </motion.button>

            {/* Messenger Button */}
            <motion.button
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleToolClick('messenger')}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border shadow-lg group relative",
                activeTool === 'messenger' 
                  ? "bg-indigo-600 border-indigo-500 shadow-indigo-500/40 text-white" 
                  : "bg-slate-900/80 backdrop-blur-xl border-white/10 text-white/60 hover:text-white hover:border-indigo-500/50 shadow-black/40"
              )}
            >
              <MessageCircle className="w-6 h-6" />
              <div className="absolute right-full mr-4 px-3 py-1.5 rounded-xl bg-slate-900/90 text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/5">
                 MESAJLAŞMA
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Hub Trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleHub}
        className={cn(
          "w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-500 relative group overflow-hidden border shadow-2xl",
          isOpen 
            ? "bg-slate-900 border-white/10 text-white rotate-90" 
            : "bg-primary border-white/20 text-white shadow-primary/25"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {isOpen ? (
          <X className="w-8 h-8 relative z-10" />
        ) : (
          <div className="relative z-10">
            <Zap className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 flex h-4 w-4">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
               <span className="relative inline-flex rounded-full h-4 w-4 bg-white/20 backdrop-blur-sm border border-white/40"></span>
            </div>
          </div>
        )}
        
        {/* Ambient Glow */}
        <div className={cn(
          "absolute -inset-4 blur-2xl rounded-full transition-colors animate-pulse",
          isOpen ? "bg-white/5" : "bg-primary/20"
        )} />
      </motion.button>
    </div>
  )
}
