'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, type Tx } from './transactions'
import { fetchLpPositions, type LpPosition } from './lp'
import { BlockscoutError } from './fetch'
import { FALLBACK_TTL, QUERY_STALE_TIME, QUERY_GC_TIME, QUERY_MAX_RETRIES } from '@/config'

// localStorage-backed fallback cache. The in-memory map is per page load; the
// persistent copy means a wallet's activity survives reloads even while
// Blockscout is rate limiting the whole day. Mirrors storage.ts's safe wrappers.
const PERSIST_KEY = 'rh_blockscout_cache'
const MAX_PERSIST_ENTRIES = 20

function readPersist(): Record<string, { data: unknown; at: number }> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, { data: unknown; at: number }> : {}
  } catch { return {} }
}

function writePersist(map: Record<string, { data: unknown; at: number }>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(map))
  } catch { /* quota exceeded — in-memory still works */ }
}

const fallbackCache = new Map<string, { data: unknown; at: number }>()

// Seed the in-memory map from localStorage on first load.
function seedCache() {
  if (typeof window === 'undefined') return
  const saved = readPersist()
  for (const [k, v] of Object.entries(saved)) {
    if (v && Date.now() - v.at < FALLBACK_TTL) fallbackCache.set(k, v)
  }
}
seedCache()

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
  // Mirror to localStorage (trimmed to most recent entries).
  if (typeof window !== 'undefined') {
    const saved = readPersist()
    saved[key] = { data, at: Date.now() }
    const entries = Object.entries(saved).sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0))
    const trimmed: Record<string, { data: unknown; at: number }> = {}
    for (const [k, v] of entries.slice(0, MAX_PERSIST_ENTRIES)) trimmed[k] = v
    writePersist(trimmed)
  }
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
