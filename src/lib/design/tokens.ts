/**
 * Tasarım token'ları – UI_REVAMP_PLAN ile uyumlu.
 * Renk, tipografi, spacing, border-radius; Card-Based, Glassmorphism, Minimalist.
 * CSS tarafında aynı değerler globals.css :root / [data-theme="dark"] içinde tanımlı.
 */

export const tokens = {
  colors: {
    primary: {
      DEFAULT: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      /** RGB değerler (rgba(...) için): 99, 102, 241 */
      rgb: '99, 102, 241',
    },
    secondary: '#f59e0b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
  },
  /** px değerleri; CSS'te rem ile de kullanılabilir */
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },
  /** Border radius (px) – 8–12px yönünde */
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  /** Gölge – soft shadows */
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    card: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
    cardHover: '0 12px 28px rgb(0 0 0 / 0.12)',
  },
  /** Geçiş süreleri (ms) – 150–200ms */
  transition: {
    fast: 150,
    normal: 200,
    slow: 300,
  },
  /** Tipografi (font-size px, line-height) */
  typography: {
    xs: { size: 12, lineHeight: 1.5 },
    sm: { size: 14, lineHeight: 1.5 },
    base: { size: 16, lineHeight: 1.5 },
    lg: { size: 18, lineHeight: 1.6 },
    xl: { size: 20, lineHeight: 1.5 },
    '2xl': { size: 24, lineHeight: 1.4 },
  },
} as const

export type Tokens = typeof tokens
