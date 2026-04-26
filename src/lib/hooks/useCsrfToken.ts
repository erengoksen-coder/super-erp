'use client'

import { useCallback, useEffect, useState } from 'react'

export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/csrf')
      if (!response.ok) throw new Error('CSRF token alınamadı')
      const data = await response.json()
      setToken(data.csrfToken)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  const refreshToken = useCallback(async () => {
    await fetchToken()
  }, [fetchToken])

  return { token, loading, error, refreshToken }
}

export function getCsrfHeader(token: string | null): Record<string, string> {
  if (!token) return {}
  return { 'x-csrf-token': token }
}
