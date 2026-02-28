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

  const baseClasses = 'block w-full rounded-xl px-4 py-2.5 border border-slate-700/50 bg-slate-900/50 text-slate-100 placeholder-slate-500/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] focus:bg-slate-800 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/30 sm:text-sm transition-all duration-300 hover:border-slate-600/80 peer'
  const variantClasses = inputVariants[variant]
  const errorClasses = error ? 'border-red-500/50 focus:border-red-500 focus:ring-[3px] focus:ring-red-500/30' : ''

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
          className="block text-[13px] font-semibold text-slate-400 mb-1.5 tracking-wide transition-colors group-focus-within:text-blue-400"
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