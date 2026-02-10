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
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-4 p-6 bg-gray-900 border border-gray-700 rounded-lg">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <h3 className="text-lg font-semibold text-white">Bir hata oluştu</h3>
          <p className="text-sm text-gray-400 text-center max-w-md">
            {this.state.error?.message || 'Beklenmeyen bir sorun oluştu.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Sayfayı yenile
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
