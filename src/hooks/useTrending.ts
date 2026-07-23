'use client'

import { useState, useEffect } from 'react'
import { fetchTrending, type TrendingToken } from '@/lib/trending'

export function useTrending() {
  const [trending, setTrending] = useState<TrendingToken[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetchTrending()
      .then(setTrending)
      .catch(e => console.warn('trending fetch failed', e))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return { trending, loading, refresh: load }
}
