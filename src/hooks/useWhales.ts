'use client'

import { useState, useEffect } from 'react'
import { fetchWhaleActivity, classifyWhales, type WhaleTx } from '@/lib/whales'

export function useWhales() {
  const [whales, setWhales] = useState<WhaleTx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchWhaleActivity()
      .then(setWhales)
      .catch(e => console.warn('whale fetch failed', e))
      .finally(() => setLoading(false))
  }, [])

  return { whales, loading, stats: classifyWhales(whales) }
}
