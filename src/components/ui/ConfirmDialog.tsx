'use client'

import React from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'warning',
  confirmText,
  cancelText,
  loading,
}) => {
  if (!isOpen) return null

  const variants = {
    danger: {
      icon: <X className="w-6 h-6 text-red-500" />,
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      button: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      icon: <AlertCircle className="w-6 h-6 text-orange-500" />,
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      button: 'bg-orange-600 hover:bg-orange-700'
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-500" />,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    success: {
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      button: 'bg-emerald-600 hover:bg-emerald-700'
    }
  }

  const v = variants[variant]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 font-sans">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-10 space-y-6">
          <div className={`w-16 h-16 ${v.bg} ${v.border} border rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            {v.icon}
          </div>
          
          <div className="text-center space-y-3">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">{title}</h3>
            <p className="text-sm font-medium text-gray-400 leading-relaxed">{message}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={onClose}
              disabled={loading}
              className="px-6 py-4 bg-gray-950 hover:bg-gray-800 text-gray-500 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-gray-800 transition-all active:scale-95"
            >
              {cancelText || 'İPTAL'}
            </button>
            <button 
              onClick={onConfirm}
              disabled={loading}
              className={`px-6 py-4 ${v.button} text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95`}
            >
              {confirmText || 'ONAYLIYORUM'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
