import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Component variant utilities
export type VariantProps<T extends Record<string, Record<string, string>>> = {
  variant?: keyof T
  size?: keyof any
  className?: string
}

// Button variants
export const buttonVariants = {
  solid: {
    primary: 'bg-primary text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700',
    error: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
  },
  outline: {
    primary: 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
    secondary: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50',
    success: 'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50',
    warning: 'border-2 border-amber-500 text-amber-600 hover:bg-amber-50',
    error: 'border-2 border-red-500 text-red-600 hover:bg-red-50',
  },
  ghost: {
    primary: 'text-primary hover:bg-primary-50 active:bg-primary-100',
    secondary: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
    success: 'text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100',
    warning: 'text-amber-600 hover:bg-amber-50 active:bg-amber-100',
    error: 'text-red-600 hover:bg-red-50 active:bg-red-100',
  }
}

export const buttonSizes = {
  xs: 'px-2 py-1 text-xs rounded-md',
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-3 text-base rounded-md',
  xl: 'px-8 py-4 text-lg rounded-lg',
  icon: 'p-2 aspect-square rounded-md',
}

// Card variants (dark mode: koyu arka plan, beyaz yazı okunabilir)
export const cardVariants = {
  elevated: 'bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-600/80 rounded-xl shadow-md dark:shadow-black/20 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200',
  flat: 'bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600/80 rounded-xl',
  outlined: 'bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-xl',
  ghost: 'bg-transparent rounded-xl',
  glass: 'bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm border border-white/20 dark:border-slate-600/80 rounded-xl shadow-lg',
}

export const cardPaddings = {
  none: '',
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
}

// Input variants
export const inputVariants = {
  outlined: 'border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20',
  underlined: 'border-0 border-b-2 border-gray-300 rounded-none focus:border-primary focus:ring-0',
  filled: 'bg-gray-100 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20',
  ghost: 'border-0 rounded-lg focus:bg-gray-50 focus:ring-2 focus:ring-primary/20',
}

// Badge variants
export const badgeVariants = {
  solid: {
    primary: 'bg-primary text-white',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  },
  outline: {
    primary: 'border border-primary text-primary',
    secondary: 'border border-gray-300 text-gray-700',
    success: 'border border-emerald-500 text-emerald-700',
    warning: 'border border-amber-500 text-amber-700',
    error: 'border border-red-500 text-red-700',
    info: 'border border-blue-500 text-blue-700',
  },
  soft: {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  }
}

// Layout utilities
export const layoutSizes = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  section: 'py-12 sm:py-16 lg:py-20',
  card: 'bg-white rounded-xl shadow-sm border border-gray-200',
  sidebar: 'w-64 bg-white border-r border-gray-200',
  header: 'h-16 bg-white border-b border-gray-200',
}

// Animation utilities
export const animations = {
  fadeIn: 'animate-in fade-in duration-200',
  fadeOut: 'animate-out fade-out duration-200',
  slideInFromTop: 'animate-in slide-in-from-top duration-300',
  slideInFromBottom: 'animate-in slide-in-from-bottom duration-300',
  slideInFromLeft: 'animate-in slide-in-from-left duration-300',
  slideInFromRight: 'animate-in slide-in-from-right duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-200',
  scaleOut: 'animate-out zoom-out-95 duration-200',
}

// Responsive utilities
export const responsive = {
  mobile: 'block sm:hidden',
  desktop: 'hidden sm:block',
  touch: 'touch-action-manipulation',
}