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
    primary: 'bg-gradient-to-tr from-blue-700 to-blue-500 text-white hover:from-blue-600 hover:to-blue-400 active:from-blue-800 active:to-blue-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 border border-blue-400/20',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-900 shadow-md shadow-black/20 hover:shadow-lg border border-slate-600/50 hover:-translate-y-0.5',
    success: 'bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 active:from-emerald-700 active:to-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 border border-emerald-400/20 hover:-translate-y-0.5',
    warning: 'bg-gradient-to-tr from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 active:from-amber-700 active:to-amber-600 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 border border-amber-400/20 hover:-translate-y-0.5',
    error: 'bg-gradient-to-tr from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 active:from-red-700 active:to-red-600 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 border border-red-400/20 hover:-translate-y-0.5',
    ghost: 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 active:bg-slate-800 border border-transparent hover:border-slate-700/50',
  },
  outline: {
    primary: 'border-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500 hover:-translate-y-0.5 shadow-sm',
    secondary: 'border-2 border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500 hover:-translate-y-0.5 shadow-sm',
    success: 'border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500 hover:-translate-y-0.5 shadow-sm',
    warning: 'border-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 hover:-translate-y-0.5 shadow-sm',
    error: 'border-2 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:-translate-y-0.5 shadow-sm',
  },
  ghost: {
    primary: 'text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/20 hover:text-blue-300 transition-colors',
    secondary: 'text-slate-400 hover:bg-slate-800/50 active:bg-slate-800 hover:text-slate-200 transition-colors',
    success: 'text-emerald-400 hover:bg-emerald-500/10 active:bg-emerald-500/20 hover:text-emerald-300 transition-colors',
    warning: 'text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/20 hover:text-amber-300 transition-colors',
    error: 'text-red-400 hover:bg-red-500/10 active:bg-red-500/20 hover:text-red-300 transition-colors',
  }
}

export const buttonSizes = {
  xs: 'px-3 py-1.5 text-xs rounded-lg font-semibold',
  sm: 'px-4 py-2 text-sm rounded-xl font-semibold',
  md: 'px-5 py-2.5 text-sm rounded-xl font-semibold tracking-wide',
  lg: 'px-7 py-3.5 text-base rounded-2xl font-bold tracking-wide',
  xl: 'px-9 py-4 text-lg rounded-2xl font-bold tracking-wide',
  icon: 'p-2.5 aspect-square rounded-xl',
}

// Card variants (dark mode: koyu arka plan, beyaz yazı okunabilir)
export const cardVariants = {
  elevated: 'bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-600/80 rounded-xl shadow-md dark:shadow-black/20 hover:shadow-lg dark:hover:shadow-xl hover:border-slate-500/60 dark:hover:border-slate-500/60 transition-all duration-200',
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
    primary: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)] backdrop-blur-sm',
    secondary: 'bg-slate-500/10 text-slate-300 border border-slate-500/20 backdrop-blur-sm',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] backdrop-blur-sm',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)] backdrop-blur-sm',
    error: 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] backdrop-blur-sm',
    info: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.15)] backdrop-blur-sm',
  },
  outline: {
    primary: 'border border-blue-500/50 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.1)]',
    secondary: 'border border-slate-500 text-slate-300',
    success: 'border border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
    warning: 'border border-amber-500/50 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.1)]',
    error: 'border border-red-500/50 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]',
    info: 'border border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.1)]',
  },
  soft: {
    primary: 'bg-blue-500/5 text-blue-400',
    secondary: 'bg-slate-500/5 text-slate-400',
    success: 'bg-emerald-500/5 text-emerald-400',
    warning: 'bg-amber-500/5 text-amber-400',
    error: 'bg-red-500/5 text-red-400',
    info: 'bg-cyan-500/5 text-cyan-400',
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