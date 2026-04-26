import React from 'react'
import { cn } from '@/lib/cn'
import { badgeVariants } from '@/lib/cn'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'solid' | 'outline' | 'soft' | 'glass'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({
  className,
  variant = 'solid',
  color = 'primary',
  size = 'md',
  dot = false,
  children,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center font-medium'
  
  const variantClasses = badgeVariants[variant]?.[color] || badgeVariants.solid.primary
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  }
  
  const classes = cn(
    baseClasses,
    variantClasses,
    sizeClasses[size],
    dot && 'gap-1.5',
    className
  )

  return (
    <span ref={ref} className={classes} {...props}>
      {dot && (
        <span 
          className={cn(
            'w-2 h-2 rounded-full',
            variant === 'solid' && 'bg-current opacity-40',
            variant === 'outline' && 'bg-current',
            variant === 'soft' && 'bg-current opacity-60'
          )}
        />
      )}
      {children}
    </span>
  )
})

Badge.displayName = 'Badge'