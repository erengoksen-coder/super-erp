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
  
  const baseClasses = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm transition-colors duration-200'
  const variantClasses = inputVariants[variant]
  const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
  
  const classes = cn(
    baseClasses,
    variantClasses,
    errorClasses,
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    className
  )

  return (
    <div className={cn('relative', fullWidth && 'w-full')}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 sm:text-sm">{leftIcon}</span>
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