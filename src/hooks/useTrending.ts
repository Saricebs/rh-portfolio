'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { fetchTrending } from '@/lib/trending'
import type { TrendingToken } from '@/lib/trending'

export function useTrending() {
  const [trending, setTrending] = useState<TrendingToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    startTransition(() => { setLoading(true); setError(null) })
    fetchTrending()
      .then(data => { if (!cancelled) startTransition(() => setTrending(data)) })
      .catch(e => {
        if (!cancelled) {
          if (process.env.NODE_ENV === 'development') console.warn('trending fetch failed', e)
          startTransition(() => setError('Failed to load trending data'))
        }
      })
      .finally(() => { if (!cancelled) startTransition(() => setLoading(false)) })
    return () => { cancelled = true }
  }, [fetchKey])

  const refresh = useCallback(() => setFetchKey(k => k + 1), [])

  return { trending, loading, error, refresh }
}
