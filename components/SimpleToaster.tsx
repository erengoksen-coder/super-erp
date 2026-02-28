'use client'

import { Toaster } from 'sonner'

export default function SimpleToaster() {
  return (
    <Toaster
      richColors
      position="bottom-right"
      expand={false}
      closeButton
      toastOptions={{
        className: 'bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] text-slate-100 rounded-xl font-medium tracking-wide',
        descriptionClassName: 'text-slate-400',
        actionButtonStyle: {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          borderRadius: '8px',
        },
        cancelButtonStyle: {
          backgroundColor: '#334155',
          color: '#cbd5e1',
          borderRadius: '8px',
        },
        style: {
          padding: '16px',
        }
      }}
    />
  )
}
