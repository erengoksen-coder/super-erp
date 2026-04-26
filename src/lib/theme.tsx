"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { tokens } from './tokens'

export type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  mode: ThemeMode
  toggleMode: () => void
  setMode: (mode: ThemeMode) => void
  colorTheme: 'indigo' | 'platinum'
  setColorTheme: (theme: 'indigo' | 'platinum') => void
  colors: typeof tokens.colors
  spacing: typeof tokens.spacing
  borderRadius: typeof tokens.borderRadius
  shadows: typeof tokens.shadows
  typography: typeof tokens.typography
  transitions: typeof tokens.transitions
  zIndex: typeof tokens.zIndex
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark')
  const [colorTheme, setColorTheme] = useState<'indigo' | 'platinum'>('indigo')

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('theme') as ThemeMode
    if (stored) {
      setMode(stored)
    } else {
      setMode('dark')
    }

    const storedColor = localStorage.getItem('color-theme') as 'indigo' | 'platinum'
    if (storedColor) {
      setColorTheme(storedColor)
    }
  }, [])

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement
    
    // Apply theme mode
    root.setAttribute('data-theme', mode)
    if (mode === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
    }

    // Apply color theme
    if (colorTheme === 'platinum') {
      root.classList.add('theme-platinum')
    } else {
      root.classList.remove('theme-platinum')
    }
    
    // Apply CSS variables
    const applyTokens = () => {
      // Base colors based on mode (light/dark)
      const baseColors = mode === 'dark' ? {
        background: '#0f172a',
        surface: '#1e293b',
        surfaceLight: '#334155',
        foreground: '#f1f5f9',
        border: '#334155',
        text: tokens.colors.gray[100],
        textSecondary: tokens.colors.gray[400],
        shadow: 'rgba(0, 0, 0, 0.3)',
      } : {
        background: '#f8fafc',
        surface: '#ffffff',
        surfaceLight: '#f1f5f9',
        foreground: '#0f172a',
        border: '#e2e8f0',
        text: tokens.colors.gray[900],
        textSecondary: tokens.colors.gray[600],
        shadow: 'rgba(0, 0, 0, 0.1)',
      }

      // Primary color based on colorTheme and mode
      let primaryColor = tokens.colors.primary[mode === 'dark' ? 500 : 600];
      if (colorTheme === 'platinum') {
        primaryColor = mode === 'dark' ? '#94a3b8' : '#64748b'; // Slate 400 or 500
      }

      const colors = {
        ...baseColors,
        primary: primaryColor,
      }
      
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value)
        if (['background', 'foreground', 'surface', 'surfaceLight', 'primary', 'border'].includes(key)) {
          root.style.setProperty(`--${key}`, value)
        }
      })
      
      // Apply other tokens
      Object.entries(tokens.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value)
      })
      
      Object.entries(tokens.borderRadius).forEach(([key, value]) => {
        root.style.setProperty(`--radius-${key}`, value)
      })
      
      Object.entries(tokens.shadows).forEach(([key, value]) => {
        const shadowValue = typeof value === 'string' ? value : 'rgba(0, 0, 0, 0.1)'
        root.style.setProperty(`--shadow-${key}`, shadowValue)
      })
      
      Object.entries(tokens.typography.fontSize).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          root.style.setProperty(`--font-size-${key}`, String(value[0]))
          const lineHeightObj = value[1]
          if (typeof lineHeightObj === 'object' && 'lineHeight' in lineHeightObj) {
            root.style.setProperty(`--line-height-${key}`, String(lineHeightObj.lineHeight))
          }
        }
      })
      
      Object.entries(tokens.transitions.duration).forEach(([key, value]) => {
        root.style.setProperty(`--duration-${key}`, value)
      })
      
      Object.entries(tokens.transitions.easing).forEach(([key, value]) => {
        root.style.setProperty(`--ease-${key}`, value)
      })
      
      Object.entries(tokens.zIndex).forEach(([key, value]) => {
        root.style.setProperty(`--z-${key}`, String(value))
      })
    }
    
    applyTokens()
    localStorage.setItem('theme', mode)
    localStorage.setItem('color-theme', colorTheme)
  }, [mode, colorTheme])

  const toggleMode = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light')
  }

  const value: ThemeContextType = {
    mode,
    toggleMode,
    setMode,
    colorTheme,
    setColorTheme,
    colors: tokens.colors,
    spacing: tokens.spacing,
    borderRadius: tokens.borderRadius,
    shadows: tokens.shadows,
    typography: tokens.typography,
    transitions: tokens.transitions,
    zIndex: tokens.zIndex,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}