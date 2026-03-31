"use client"

import { useEffect, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { usePathname, useSearchParams } from 'next/navigation'

export const TopLoader = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  
  const progress = useMotionValue(0)
  const width = useTransform(progress, (v) => `${v}%`)
  const opacity = useTransform(progress, (v) => v === 0 || v === 100 ? 0 : 1)

  useEffect(() => {
    // Start loading on route change
    setLoading(true)
    progress.set(0)
    
    // Simulate initial jump
    const jump = animate(progress, 30, { 
      duration: 0.5, 
      ease: "easeOut" 
    })
    
    // Slower progress thereafter
    const slow = animate(progress, 90, { 
      duration: 8, 
      ease: "linear",
      delay: 0.5
    })

    // Stop and finish when route is loaded
    const timer = setTimeout(() => {
      jump.stop()
      slow.stop()
      animate(progress, 100, { 
        duration: 0.3, 
        ease: "easeOut" 
      }).then(() => {
        setLoading(false)
        progress.set(0)
      })
    }, 400) // Small delay to prevent flickering on fast loads

    return () => {
      clearTimeout(timer)
      jump.stop()
      slow.stop()
    }
  }, [pathname, searchParams, progress])

  return (
    <motion.div
      style={{
        width,
        opacity,
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        background: 'linear-gradient(to right, var(--primary), var(--accent))',
        zIndex: 9999,
        boxShadow: '0 0 10px rgba(var(--primary-rgb), 0.5)'
      }}
    />
  )
}
