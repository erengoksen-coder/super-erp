import React from 'react'
import { cn } from '@/lib/cn'
import { cardVariants, cardPaddings } from '@/lib/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'flat' | 'outlined' | 'ghost' | 'glass'
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
}

interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  subtitle?: string
  actions?: React.ReactNode
}

type CardBodyProps = React.HTMLAttributes<HTMLDivElement>

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  className,
  variant = 'flat',
  padding = 'md',
  hover = false,
  children,
  ...props
}, ref) => {
  const classes = cn(
    cardVariants[variant],
    cardPaddings[padding],
    variant === 'glass' && 'glass',
    hover && 'transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-primary/5',
    className
  )

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  )
})

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(({
  className,
  title,
  subtitle,
  actions,
  children,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={cn('flex items-center justify-between mb-4', className)} {...props}>
      <div className="flex-1">
        {title && (
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex items-center space-x-2 ml-4">
          {actions}
        </div>
      )}
    </div>
  )
})

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(({
  className,
  children,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={cn('', className)} {...props}>
      {children}
    </div>
  )
})

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(({
  className,
  children,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={cn('mt-4 pt-4 border-t border-gray-200', className)} {...props}>
      {children}
    </div>
  )
})

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardBody.displayName = 'CardBody'
CardFooter.displayName = 'CardFooter'