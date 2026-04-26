import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeEnd?: () => void
  leftAction?: {
    icon: React.ReactNode
    label: string
    color: 'primary' | 'success' | 'warning' | 'error'
  }
  rightAction?: {
    icon: React.ReactNode
    label: string
    color: 'primary' | 'success' | 'warning' | 'error'
  }
  className?: string
}

export const SwipeableCard = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeEnd,
  leftAction,
  rightAction,
  className
}: SwipeableCardProps) => {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    startX.current = e.touches[0].clientX
    currentX.current = translateX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const deltaX = e.touches[0].clientX - startX.current
    const newTranslateX = currentX.current + deltaX
    
    // Limit the translation
    const maxTranslate = rightAction ? 100 : 50
    const minTranslate = leftAction ? -100 : -50
    
    setTranslateX(Math.max(minTranslate, Math.min(maxTranslate, newTranslateX)))
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    const threshold = 50
    
    if (translateX > threshold && onSwipeRight) {
      onSwipeRight()
      setTranslateX(0)
    } else if (translateX < -threshold && onSwipeLeft) {
      onSwipeLeft()
      setTranslateX(0)
    } else {
      // Animate back to center
      setTranslateX(0)
    }
    
    onSwipeEnd?.()
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary': return 'bg-primary text-white'
      case 'success': return 'bg-emerald-500 text-white'
      case 'warning': return 'bg-amber-500 text-white'
      case 'error': return 'bg-red-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Left Action Background */}
      {leftAction && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center px-4 z-0',
            getColorClasses(leftAction.color)
          )}
        >
          <div className="flex items-center space-x-2">
            {leftAction.icon}
            <span className="text-sm font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}
      
      {/* Right Action Background */}
      {rightAction && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center px-4 z-0',
            getColorClasses(rightAction.color)
          )}
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{rightAction.label}</span>
            {rightAction.icon}
          </div>
        </div>
      )}
      
      {/* Swipeable Card */}
      <div
        ref={cardRef}
        className={cn(
          'relative z-10 touch-none transition-transform duration-200',
          isDragging && 'transition-none'
        )}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  isRefreshing: boolean
  children: React.ReactNode
  threshold?: number
}

export const PullToRefresh = ({
  onRefresh,
  isRefreshing,
  children,
  threshold = 60
}: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return
    
    const currentY = e.touches[0].clientY
    const deltaY = currentY - startY.current
    
    if (deltaY > 0) {
      e.preventDefault()
      setPullDistance(Math.min(deltaY * 0.5, threshold * 1.5))
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling) return
    
    setIsPulling(false)
    
    if (pullDistance >= threshold && !isRefreshing) {
      await onRefresh()
    }
    
    setPullDistance(0)
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-primary/10 transition-all duration-200 z-20"
        style={{
          height: `${Math.min(pullDistance, threshold)}px`,
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        <div className="flex items-center space-x-2 text-primary">
          {isRefreshing ? (
            <div className="animate-spin">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          <span className="text-sm font-medium">
            {isRefreshing ? 'Yenileniyor...' : 'Yenilemek için çekin'}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ transform: `translateY(${Math.min(pullDistance, threshold)}px)` }}>
        {children}
      </div>
    </div>
  )
}

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  ripple?: boolean
  haptic?: boolean
}

export const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(({
  className,
  variant = 'primary',
  size = 'md',
  ripple = true,
  haptic = true,
  onClick,
  children,
  ...props
}, ref) => {
  const [ripples, setRipples] = useState<Array<{id: number, x: number, y: number}>>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const newRipple = {
        id: Date.now(),
        x,
        y
      }
      
      setRipples(prev => [...prev, newRipple])
      
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 600)
    }
    
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
    
    onClick?.(e)
  }

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-600 active:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200'
  }

  const sizeClasses = {
    sm: 'px-4 py-3 text-sm min-h-[44px]',
    md: 'px-6 py-4 text-base min-h-[48px]',
    lg: 'px-8 py-6 text-lg min-h-[52px]'
  }

  return (
    <button
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.5)',
            transform: 'scale(0)',
            animation: 'ripple 0.6s ease-out forwards'
          }}
        />
      ))}
      {children}
    </button>
  )
})

MobileButton.displayName = 'MobileButton'