'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

type State = {
  hasError: boolean
  error?: Error
}

/**
 * Hata sınırı: alt bileşenlerde yakalanmamış hata olursa fallback gösterir.
 * Sayfa yenileme ile kurtarılabilir.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (typeof window !== 'undefined' && window.console) {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-6 p-8 glass border-red-500/20 rounded-2xl animate-reveal">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-red-500/20 rounded-full animate-pulse" />
            <AlertTriangle className="relative w-16 h-16 text-red-500" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">Beklenmedik Bir Hata Oluştu</h3>
            <p className="text-gray-400 max-w-md">
              Sistem bu bileşeni yüklerken bir sorunla karşılaştı. Endişelenmeyin, verileriniz güvende.
            </p>
          </div>

          {this.state.error && (
            <div className="w-full max-w-lg p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-red-400/80 overflow-auto max-h-[120px] whitespace-pre-wrap">
              {this.state.error.stack || this.state.error.message}
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-all active:scale-95 shadow-lg shadow-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              Sayfayı Yenile
            </button>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-all border border-white/10"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
