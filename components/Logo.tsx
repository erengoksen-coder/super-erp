'use client'

import React, { useState, useEffect } from 'react'
import { fetchApi } from '@/lib/api/client'

interface LogoProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'label'
}

export function LogoWithBackground({ className = '', size = 'md' }: LogoProps) {
  const [logo, setLogo] = useState<string | null>(null)

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const settings = await fetchApi('/api/system/settings') as any
        if (settings.company_logo) {
          setLogo(settings.company_logo)
        }
      } catch (error) {
        // Fallback to default public logo
      }
    }
    loadLogo()
  }, [])

  const sizeClasses = {
    xs: 'h-12 w-auto',
    sm: 'h-24 w-auto',
    md: 'h-32 w-auto',
    lg: 'h-48 w-auto',
    label: 'w-full h-auto',
  }

  return (
    <div className={`${size === 'label' ? 'w-full' : (sizeClasses as any)[size]} ${className} flex items-center justify-center`}>
      <img 
        src={logo || "/logo.png"} 
        alt="Sistem Logo" 
        className={`${size === 'label' ? 'w-full h-auto' : sizeClasses[size]} object-contain`}
        style={{ 
          maxHeight: size === 'xs' ? '48px' : size === 'sm' ? '96px' : size === 'md' ? '128px' : size === 'lg' ? '192px' : '25mm',
          imageRendering: size === 'label' ? '-webkit-optimize-contrast' : 'auto',
          WebkitImageRendering: size === 'label' ? '-webkit-optimize-contrast' : 'auto',
          msInterpolationMode: size === 'label' ? 'bicubic' : 'auto',
          filter: size === 'label' ? 'contrast(1.15) brightness(1.05)' : 'none'
        } as any}
      />
    </div>
  )
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses: Record<string, string> = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
  }

  return (
    <div className={`${sizeClasses[size] || sizeClasses.md} ${className}`}>
        {/* LIVA SOFA Text Logo Fallback */}
        <div className="font-black text-white italic tracking-tighter text-xl">
            LIVA<span className="text-primary">SOFA</span>
        </div>
    </div>
  )
}
