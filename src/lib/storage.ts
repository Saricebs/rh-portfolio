// ── localStorage utils with type safety ──

const RECENT_SEARCHES_KEY = 'rh_recent_searches'
const MAX_SEARCHES = 10

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === 'string' && s.length === 42)
  } catch {
    return []
  }
}

export function addRecentSearch(address: string): void {
  if (typeof window === 'undefined') return
  const prev = getRecentSearches().filter(a => a !== address)
  const next = [address, ...prev].slice(0, MAX_SEARCHES)
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
  } catch { /* quota exceeded — silently ignore */ }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch { /* ignore */ }
}

// ── Cost basis ──
// The README advertises cost basis as "saved in your browser"; it previously
// lived only in React state and was lost on every reload.

const COST_BASIS_KEY = 'rh_cost_basis'

export function getCostBasis(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(COST_BASIS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string' && Number.isFinite(parseFloat(v))) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

export function setCostBasis(map: Record<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(COST_BASIS_KEY, JSON.stringify(map))
  } catch { /* quota exceeded — silently ignore */ }
}

export function clearCostBasis(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(COST_BASIS_KEY)
  } catch { /* ignore */ }
}

// ── Last updated ──

const LAST_UPDATED_KEY = 'rh_last_updated'

export function getLastUpdated(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_UPDATED_KEY)
}

export function setLastUpdated(now: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAST_UPDATED_KEY, now)
  } catch { /* ignore */ }
}
