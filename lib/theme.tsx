"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { tokens } from './tokens'

export type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  mode: ThemeMode
  toggleMode: () => void
  setMode: (mode: ThemeMode) => void
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

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('theme') as ThemeMode
    if (stored) {
      setMode(stored)
    } else {
      setMode('dark')
    }
  }, [])

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement
    
    // Apply theme mode
    root.setAttribute('data-theme', mode)
    
    // Apply CSS variables
    const applyTokens = () => {
      // Colors
      const colors = mode === 'dark' ? {
        primary: tokens.colors.primary[500],
        background: tokens.colors.background.dark,
        surface: tokens.colors.background.darkSecondary,
        surfaceLight: tokens.colors.background.darkTertiary,
        text: tokens.colors.gray[100],
        textSecondary: tokens.colors.gray[400],
        border: tokens.colors.gray[700],
        shadow: 'rgba(0, 0, 0, 0.3)',
      } : {
        primary: tokens.colors.primary[500],
        background: tokens.colors.background.primary,
        surface: tokens.colors.background.secondary,
        surfaceLight: tokens.colors.background.tertiary,
        text: tokens.colors.gray[900],
        textSecondary: tokens.colors.gray[600],
        border: tokens.colors.gray[200],
        shadow: 'rgba(0, 0, 0, 0.1)',
      }
      
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value)
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
  }, [mode])

  const toggleMode = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light')
  }

  const value: ThemeContextType = {
    mode,
    toggleMode,
    setMode,
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