'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, type Tx } from './transactions'
import { fetchLpPositions, type LpPosition } from './lp'

// ── In-memory fallback cache for 429 recovery ──
const fallbackCache = new Map<string, { data: unknown; at: number }>()
const FALLBACK_TTL = 300_000 // 5 min

function getCached<T>(key: string): T | null {
  const entry = fallbackCache.get(key)
  if (entry && Date.now() - entry.at < FALLBACK_TTL) return entry.data as T
  return null
}

function setCache(key: string, data: unknown) {
  fallbackCache.set(key, { data, at: Date.now() })
}

// ── Helper: wrap any fetch to handle 429 ──
async function with429Fallback<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<{ data: T; warning: string | null }> {
  try {
    const data = await fetcher()
    setCache(key, data)
    return { data, warning: null }
  } catch (err) {
    const is429 = err instanceof Error && (
      err.message.includes('429') || err.message.includes('rate limit') || err.message.includes('too many requests')
    )
    if (is429) {
      const cached = getCached<T>(key)
      if (cached) return { data: cached, warning: '⚠ Blockscout rate limited — showing cached data' }
    }
    throw err
  }
}

// ── Txs query ──
export function useTxsQuery(address: string | null) {
  return useQuery({
    queryKey: ['blockscout-txs', address],
    queryFn: async (): Promise<{ data: Tx[]; warning: string | null }> => {
      if (!address) return { data: [], warning: null }
      const result = await with429Fallback<Tx[]>(`txs:${address}`, () => fetchTransactions(address))
      return result
    },
    enabled: !!address,
    staleTime: 120_000,
    retry: 3,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10_000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

// ── LP positions query ──
export function useLpQuery(address: string | null) {
  return useQuery({
    queryKey: ['blockscout-lp', address],
    queryFn: async (): Promise<{ data: LpPosition[]; warning: string | null }> => {
      if (!address) return { data: [], warning: null }
      const result = await with429Fallback<LpPosition[]>(`lp:${address}`, () => fetchLpPositions(address))
      return result
    },
    enabled: !!address,
    staleTime: 120_000,
    retry: 3,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10_000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
