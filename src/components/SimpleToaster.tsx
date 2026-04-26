'use client'

import { Toaster } from 'sonner'

export default function SimpleToaster() {
  return (
    <Toaster
      richColors
      position="top-center"
      expand={true}
      closeButton
      toastOptions={{
        className: 'bg-slate-900 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white rounded-[24px] font-bold p-6 min-w-[320px] backdrop-blur-3xl',
        descriptionClassName: 'text-slate-300 font-medium mt-1 leading-relaxed',
        style: {
          marginTop: '20vh',
        }
      }}
    />
  )
}
