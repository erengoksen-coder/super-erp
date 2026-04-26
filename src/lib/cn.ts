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
    primary: 'bg-primary text-white hover:opacity-90 active:scale-95 shadow-md shadow-primary/20 transition-all duration-200',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 transition-all duration-200',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 shadow-md shadow-emerald-500/20 transition-all duration-200',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-md shadow-amber-500/20 transition-all duration-200',
    error: 'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-md shadow-red-500/20 transition-all duration-200',
    ghost: 'bg-transparent text-foreground hover:bg-white/5 active:scale-95 transition-all duration-200',
  },
  outline: {
    primary: 'border-2 border-primary text-primary hover:bg-primary hover:text-white active:scale-95 transition-all duration-200',
    secondary: 'border-2 border-border text-foreground hover:bg-secondary active:scale-95 transition-all duration-200',
    success: 'border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white active:scale-95 transition-all duration-200',
    warning: 'border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white active:scale-95 transition-all duration-200',
    error: 'border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white active:scale-95 transition-all duration-200',
  },
  soft: {
    primary: 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all duration-200 border border-primary/20',
    secondary: 'bg-secondary/10 text-secondary-foreground hover:bg-secondary/20 active:scale-95 transition-all duration-200 border border-border',
    success: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 active:scale-95 transition-all duration-200 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 active:scale-95 transition-all duration-200 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all duration-200 border border-red-500/20',
  },
  ghost: {
    primary: 'text-primary hover:bg-primary/10 active:scale-95 transition-all duration-200',
    secondary: 'text-foreground/70 hover:bg-white/5 hover:text-foreground active:scale-95 transition-all duration-200',
    success: 'text-emerald-500 hover:bg-emerald-500/10 active:scale-95 transition-all duration-200',
    warning: 'text-amber-500 hover:bg-amber-500/10 active:scale-95 transition-all duration-200',
    error: 'text-red-500 hover:bg-red-500/10 active:scale-95 transition-all duration-200',
  },
  glass: {
    primary: 'glass text-white hover:bg-white/10 active:scale-95 transition-all duration-200 border border-white/10 shadow-xl shadow-primary/10',
    secondary: 'glass text-foreground/70 hover:bg-white/10 active:scale-95 transition-all duration-200 border border-white/10',
    success: 'glass text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all duration-200 border border-emerald-500/20',
    warning: 'glass text-amber-400 hover:bg-amber-500/10 active:scale-95 transition-all duration-200 border border-amber-500/20',
    error: 'glass text-red-500 hover:bg-red-500/10 active:scale-95 transition-all duration-200 border border-red-500/20',
  }
}

export const buttonSizes = {
  xs: 'px-2.5 py-1 text-xs font-medium rounded-md',
  sm: 'px-3.5 py-1.5 text-sm font-medium rounded-lg',
  md: 'px-5 py-2.5 text-sm font-semibold rounded-xl',
  lg: 'px-7 py-3.5 text-base font-semibold rounded-xl',
  xl: 'px-9 py-4 text-lg font-bold rounded-2xl',
  icon: 'p-2.5 aspect-square rounded-xl items-center justify-center inline-flex',
}

// Card variants
export const cardVariants = {
  elevated: 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xl shadow-black/20 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1',
  flat: 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl',
  outlined: 'bg-transparent text-[var(--foreground)] border-2 border-[var(--border)] rounded-2xl',
  ghost: 'bg-transparent rounded-2xl',
  glass: 'glass rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1',
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
  outlined: 'bg-white/5 border border-border/50 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/50',
  underlined: 'bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:border-primary placeholder:text-muted-foreground/50',
  filled: 'bg-muted/50 border-0 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:bg-white/10 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50',
  ghost: 'bg-transparent border-0 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:bg-white/5 placeholder:text-muted-foreground/50',
}

// Badge variants
export const badgeVariants = {
  solid: {
    primary: 'bg-primary text-white shadow-sm',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm',
    success: 'bg-emerald-500 text-white shadow-sm',
    warning: 'bg-amber-500 text-white shadow-sm',
    error: 'bg-red-500 text-white shadow-sm',
    info: 'bg-blue-500 text-white shadow-sm',
  },
  outline: {
    primary: 'border border-primary text-primary',
    secondary: 'border border-border text-foreground',
    success: 'border border-emerald-500 text-emerald-500',
    warning: 'border border-amber-500 text-amber-500',
    error: 'border border-red-500 text-red-500',
    info: 'border border-blue-500 text-blue-500',
  },
  soft: {
    primary: 'bg-primary/10 text-primary border border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground border border-border',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border border-red-500/20',
    info: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  },
  glass: {
    primary: 'bg-white/10 backdrop-blur text-white border border-white/20 shadow-sm',
    secondary: 'bg-white/5 backdrop-blur text-foreground/70 border border-white/10 shadow-sm',
    success: 'bg-emerald-500/10 backdrop-blur text-emerald-400 border border-emerald-500/20 shadow-sm',
    warning: 'bg-amber-500/10 backdrop-blur text-amber-400 border border-amber-500/20 shadow-sm',
    error: 'bg-red-500/10 backdrop-blur text-red-400 border border-red-500/20 shadow-sm',
    info: 'bg-blue-500/10 backdrop-blur text-blue-400 border border-blue-500/20 shadow-sm',
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