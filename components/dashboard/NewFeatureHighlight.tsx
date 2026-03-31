'use client'

import { useState, useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'

interface NewFeatureHighlightProps {
  featureId: string
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function NewFeatureHighlight({ 
  featureId, 
  children, 
  title, 
  description,
  className 
}: NewFeatureHighlightProps) {
  const [showHighlight, setShowHighlight] = useState(false)

  useEffect(() => {
    const isDismissed = localStorage.getItem(`highlight_dismissed_${featureId}`)
    if (!isDismissed) {
      setShowHighlight(true)
    }
  }, [featureId])

  const handleDismiss = () => {
    localStorage.setItem(`highlight_dismissed_${featureId}`, 'true')
    setShowHighlight(false)
  }

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {showHighlight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -top-3 -right-3 z-30"
          >
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-lg border border-white/20 animate-bounce">
              <Sparkles className="w-3 h-3" />
              YENİ
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={cn(
        "transition-all duration-500",
        showHighlight && "ring-2 ring-amber-400/30 rounded-xl bg-amber-400/5 ring-offset-2 ring-offset-transparent"
      )}>
        {children}
      </div>
    </div>
  )
}
