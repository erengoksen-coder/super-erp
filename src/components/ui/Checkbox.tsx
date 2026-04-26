'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'
import { Check } from 'lucide-react'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked)
    }

    return (
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "peer h-5 w-5 appearance-none rounded-lg border-2 border-white/10 bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 checked:border-primary checked:bg-primary/20",
            className
          )}
          onChange={handleChange}
          {...props}
        />
        <Check 
          className="absolute w-3.5 h-3.5 text-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" 
          strokeWidth={4}
        />
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
