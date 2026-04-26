'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export const AnimatedCounter = ({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className
}: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0)
  const startTimeRef = useRef<number | undefined>(undefined)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const startValue = displayValue
    const endValue = value
    const startTime = Date.now()
    startTimeRef.current = startTime

    const animate = () => {
      if (startTimeRef.current === undefined) return
      
      const elapsed = Date.now() - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      
      const currentValue = startValue + (endValue - startValue) * easeOutQuart
      setDisplayValue(currentValue)
      
      if (progress < 1) {
    animationRef.current = setTimeout(animate, 16) as any
      }
    }

    animationRef.current = requestAnimationFrame(animate)

  return () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current)
    }
  }
  }, [value, duration, displayValue])

  const formatValue = (num: number) => {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}{formatValue(displayValue)}{suffix}
    </span>
  )
}

interface TypewriterProps {
  text: string
  speed?: number
  delay?: number
  className?: string
  onComplete?: () => void
}

export const Typewriter = ({
  text,
  speed = 50,
  delay = 0,
  className,
  onComplete
}: TypewriterProps) => {
  const [displayText, setDisplayText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      let currentIndex = 0
      
      const typeWriter = () => {
        if (currentIndex < text.length) {
          setDisplayText(text.substring(0, currentIndex + 1))
          currentIndex++
          setTimeout(typeWriter, speed)
        } else {
          setIsComplete(true)
          onComplete?.()
        }
      }
      
      typeWriter()
    }, delay)

    return () => clearTimeout(timer)
  }, [text, speed, delay, onComplete])

  return (
    <span className={cn('font-mono', className)}>
      {displayText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  )
}

interface ParticleEffectProps {
  trigger: boolean
  color?: string
  particleCount?: number
  className?: string
  onComplete?: () => void
}

export const ParticleEffect = ({
  trigger,
  color = '#6366f1',
  particleCount = 12,
  className,
  onComplete
}: ParticleEffectProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100
      }))
      
      setParticles(newParticles)
      
      setTimeout(() => {
        setParticles([])
        onComplete?.()
      }, 800)
    }
  }, [trigger, particleCount, onComplete])

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            '--x': `${particle.x}px`,
            '--y': `${particle.y}px`,
            background: color,
            left: '50%',
            top: '50%',
            marginLeft: '-4px',
            marginTop: '-4px'
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

interface ShakeAnimationProps {
  trigger: boolean
  children: React.ReactNode
  intensity?: 'light' | 'medium' | 'strong'
  className?: string
}

export const ShakeAnimation = ({
  trigger,
  children,
  intensity = 'medium',
  className
}: ShakeAnimationProps) => {
  const [isShaking, setIsShaking] = useState(false)

  const intensityClasses = {
    light: 'animate-shake-light',
    medium: 'animate-shake',
    strong: 'animate-shake-strong'
  }

  useEffect(() => {
    if (trigger) {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }, [trigger])

  return (
    <div className={cn(isShaking && intensityClasses[intensity], className)}>
      {children}
    </div>
  )
}

interface MorphingTextProps {
  words: string[]
  interval?: number
  className?: string
}

export const MorphingText = ({
  words,
  interval = 2000,
  className
}: MorphingTextProps) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true)
      
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % words.length)
        setIsAnimating(false)
      }, 150)
    }, interval)

    return () => clearInterval(timer)
  }, [words.length, interval])

  return (
    <span className={cn('inline-block transition-all duration-300', isAnimating && 'scale-95 opacity-0', className)}>
      {words[currentWordIndex]}
    </span>
  )
}

interface ProgressiveRevealProps {
  children: React.ReactNode[]
  delay?: number
  className?: string
}

export const ProgressiveReveal = ({
  children,
  delay = 100,
  className
}: ProgressiveRevealProps) => {
  const [revealedItems, setRevealedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    children.forEach((_, index) => {
      setTimeout(() => {
        setRevealedItems(prev => new Set(prev).add(index))
      }, index * delay)
    })
  }, [children.length, delay])

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          className={cn(
            'transition-all duration-500',
            revealedItems.has(index) 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          )}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

interface FloatingElementProps {
  children: React.ReactNode
  amplitude?: number
  duration?: number
  delay?: number
  className?: string
}

export const FloatingElement = ({
  children,
  amplitude = 10,
  duration = 3000,
  delay = 0,
  className
}: FloatingElementProps) => {
  return (
    <div
      className={cn('animate-float', className)}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        '--float-amplitude': `${amplitude}px`
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  className?: string
}

export const ProgressRing = ({
  progress,
  size = 120,
  strokeWidth = 8,
  className
}: ProgressRingProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress)
    }, 100)
    return () => clearTimeout(timer)
  }, [progress])

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-all duration-1000 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-semibold">
          {Math.round(animatedProgress)}%
        </span>
      </div>
    </div>
  )
}

interface ConfettiEffectProps {
  trigger: boolean
  onComplete?: () => void
  className?: string
}

export const ConfettiEffect = ({ trigger, onComplete, className }: ConfettiEffectProps) => {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    y: number
    color: string
    rotation: number
    duration: number
    delay: number
  }>>([])

  useEffect(() => {
    if (trigger) {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 0.5
      }))
      
      setParticles(newParticles)
      
      setTimeout(() => {
        setParticles([])
        onComplete?.()
      }, 3000)
    }
  }, [trigger, onComplete])

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 animate-bounce"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(${particle.x}px, ${particle.y}px) rotate(${particle.rotation}deg)`,
            backgroundColor: particle.color,
            animation: `fall ${particle.duration}s ease-out forwards`,
            animationDelay: `${particle.delay}s`
          }}
        />
      ))}
      

    </div>
  )
}