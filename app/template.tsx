'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    // Login/auth sayfalarında animasyon istemeyebiliriz veya daha hafif bir şey isteyebiliriz
    const isAuthPage = pathname === '/login' || pathname === '/register'

    return (
        <motion.div
            key={pathname}
            initial={{ opacity: 0, y: isAuthPage ? 0 : 15, scale: isAuthPage ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isAuthPage ? 0 : -15, scale: 0.98 }}
            transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
            }}
            className="flex flex-col flex-1 h-full w-full"
        >
            {children}
        </motion.div>
    )
}
