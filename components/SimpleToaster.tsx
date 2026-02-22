'use client'

import { Toaster } from 'sonner'

export default function SimpleToaster() {
  return (
    <Toaster
      richColors
      position="top-right"
      closeButton
      toastOptions={{
        style: { marginTop: 0 },
      }}
    />
  )
}
