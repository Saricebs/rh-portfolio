'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, type Tx } from './transactions'
import { fetchLpPositions, type LpPosition } from './lp'
import { FALLBACK_TTL, QUERY_STALE_TIME, QUERY_GC_TIME, QUERY_MAX_RETRIES } from '@/config'

const fallbackCache = new Map<string, { data: unknown; at: number }>()

function getCached<T>(key: string): T | null {
  const entry = fallbackCache.get(key)
  if (entry && Date.now() - entry.at < FALLBACK_TTL) return entry.data as T
  return null
}

function setCache(key: string, data: unknown) {
  fallbackCache.set(key, { data, at: Date.now() })
}

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

const queryDefaults = {
  staleTime: QUERY_STALE_TIME,
  gcTime: QUERY_GC_TIME,
  retry: QUERY_MAX_RETRIES,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
}

export function useTxsQuery(address: string | null) {
  return useQuery({
    queryKey: ['blockscout-txs', address],
    queryFn: async (): Promise<{ data: Tx[]; warning: string | null }> => {
      if (!address) return { data: [], warning: null }
      return with429Fallback<Tx[]>(`txs:${address}`, () => fetchTransactions(address))
    },
    enabled: !!address,
    ...queryDefaults,
  })
}

export function useLpQuery(address: string | null) {
  return useQuery({
    queryKey: ['blockscout-lp', address],
    queryFn: async (): Promise<{ data: LpPosition[]; warning: string | null }> => {
      if (!address) return { data: [], warning: null }
      return with429Fallback<LpPosition[]>(`lp:${address}`, () => fetchLpPositions(address))
    },
    enabled: !!address,
    ...queryDefaults,
  })
}
