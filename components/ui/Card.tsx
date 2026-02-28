import React from 'react'
import { cn } from '@/lib/cn'
import { cardVariants, cardPaddings } from '@/lib/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'flat' | 'outlined' | 'ghost' | 'glass'
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  icon?: React.ElementType
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
    hover && 'transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
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
  icon: Icon,
  actions,
  children,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={cn('flex items-center justify-between mb-4', className)} {...props}>
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        {Icon && (
          <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
            <Icon className="w-5 h-5 text-gray-700 dark:text-slate-400 group-hover:text-blue-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:group-hover:text-white transition-colors truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-slate-400 dark:group-hover:text-white mt-0.5 transition-colors truncate">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
      {actions && (
        <div className="flex items-center space-x-2 ml-4 [&>*]:transition-colors group-hover:[&>*]:text-gray-700 dark:group-hover:[&>*]:text-white">
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