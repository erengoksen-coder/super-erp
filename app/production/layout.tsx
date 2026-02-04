import { ReactNode } from 'react'

/**
 * Production Layout
 * Tüm /production/* sayfaları için ortak layout wrapper
 * MainShell zaten padding sağlıyor, burada sadece width standardı
 */
export default function ProductionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      {children}
    </div>
  )
}
