'use client'

import * as React from "react"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  const titleId = React.useId()
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/60 shadow-[0_0_40px_-10px_rgba(0,0,0,0.7)] ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 id={titleId} className="text-xl font-semibold text-white">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-all duration-200 p-1.5 rounded-xl hover:bg-slate-800/80 hover:scale-110 active:scale-95"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}


