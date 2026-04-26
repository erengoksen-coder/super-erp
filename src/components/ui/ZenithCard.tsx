'use client'

import React from 'react'
import { cn } from '@/lib/cn'
import { motion } from 'framer-motion'

interface ZenithCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  variant?: 'glass' | 'solid' | 'outline'
}

export function ZenithCard({ 
  children, 
  className, 
  hover = true, 
  glow = false,
  variant = 'glass' 
}: ZenithCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -5, transition: { duration: 0.2 } } : {}}
      className={cn(
        "rounded-[2.5rem] p-6 transition-all duration-300",
        variant === 'glass' && "glass border-white/10 dark:border-white/5",
        variant === 'solid' && "bg-surface shadow-card",
        variant === 'outline' && "border-2 border-primary/20",
        glow && "glow-primary",
        hover && "hover:shadow-2xl hover:shadow-primary/10",
        className
      )}
    >
      {children}
    </motion.div>
  )
}

export function ZenithHeader({ title, subtitle, icon: Icon }: { title: string, subtitle?: string, icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      {Icon && (
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      )}
      <div>
        <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-white/50">{subtitle}</p>}
      </div>
    </div>
  )
}
