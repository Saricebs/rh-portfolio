'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, type Tx } from './transactions'
import { fetchLpPositions, type LpPosition } from './lp'
import { BlockscoutError } from './fetch'
import { FALLBACK_TTL, QUERY_STALE_TIME, QUERY_GC_TIME, QUERY_MAX_RETRIES } from '@/config'

const fallbackCache = new Map<string, { data: unknown; at: number }>()

function getCached<T>(key: string): T | null {
  const entry = fallbackCache.get(key)
  if (entry && Date.now() - entry.at < FALLBACK_TTL) return entry.data as T
  return null
}

function setCache(key: string, data: unknown) {
  // Never let an empty result evict a good one that is still inside its TTL —
  // an upstream hiccup that yields [] would otherwise destroy the fallback.
  if (Array.isArray(data) && data.length === 0) {
    const existing = fallbackCache.get(key)
    if (existing && Date.now() - existing.at < FALLBACK_TTL) return
  }
  fallbackCache.set(key, { data, at: Date.now() })
}

function isRateLimitError(err: unknown): boolean {
  if (err instanceof BlockscoutError) return err.status === 429 || err.status === 503
  if (err instanceof Error) {
    const m = err.message.toLowerCase()
    return m.includes('429') || m.includes('rate limit') || m.includes('too many requests')
  }
  return false
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
    if (isRateLimitError(err)) {
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

/** Don't burn retries hammering an endpoint that is already rate limiting us. */
function retryUnlessRateLimited(failureCount: number, error: unknown) {
  if (isRateLimitError(error)) return false
  return failureCount < QUERY_MAX_RETRIES
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
    retry: retryUnlessRateLimited,
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
    retry: retryUnlessRateLimited,
  })
}
