import React from 'react'
import { cn } from '@/lib/cn'
import { inputVariants } from '@/lib/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'outlined' | 'underlined' | 'filled' | 'ghost'
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  className,
  variant = 'outlined',
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  id,
  ...props
}, ref) => {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  
  const baseClasses = 'block w-full text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed selection:bg-primary/30'
  const variantClasses = inputVariants[variant]
  const errorClasses = error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''
  
  const classes = cn(
    baseClasses,
    variantClasses,
    errorClasses,
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    className
  )

  return (
    <div className={cn('relative group', fullWidth && 'w-full')}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5 transition-colors group-focus-within:text-primary"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
            <span className="text-muted-foreground/60">{leftIcon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={classes}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400 sm:text-sm">{rightIcon}</span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600" id={`${inputId}-error`}>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500" id={`${inputId}-helper`}>
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'