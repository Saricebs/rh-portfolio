import { COINGECKO_IDS, FETCH_TIMEOUT } from '@/config'
import { fetchWithTimeout, toError } from './fetch'
import type { TokenInfo } from '@/lib/chain'

interface PricePoint { t: number; p: number }

export interface ChartData {
  timestamps: number[]
  values: number[]
}

async function fetchCoinGeckoChart(id: string, days: number): Promise<PricePoint[]> {
  const res = await fetchWithTimeout(
    `/api/coingecko/chart?id=${encodeURIComponent(id)}&days=${days}`,
    undefined,
    FETCH_TIMEOUT,
  )
  if (!res.ok) throw await toError(res, 'coingecko')
  const json = await res.json()
  const raw: unknown = json?.prices
  if (!Array.isArray(raw)) return []
  return raw
    .map((pair: unknown) => {
      if (!Array.isArray(pair)) return null
      const t = Number(pair[0])
      const p = Number(pair[1])
      return Number.isFinite(t) && Number.isFinite(p) ? { t, p } : null
    })
    .filter((x): x is PricePoint => x !== null)
    .sort((a, b) => a.t - b.t)
}

/**
 * Price of `series` at time `t`, using the most recent sample at or before `t`.
 * Series from different coins come back with different lengths and cadences, so
 * combining them positionally (series[i]) silently misaligns the timeline and
 * zero-fills the tail. `cursor` walks forward across calls — the reference
 * timestamps are ascending, so the whole join stays O(n).
 */
function priceAt(series: PricePoint[], t: number, cursor: { i: number }): number | null {
  if (series.length === 0) return null
  while (cursor.i + 1 < series.length && series[cursor.i + 1].t <= t) cursor.i++
  const point = series[cursor.i]
  if (!point) return null
  // Before the series starts there is nothing to carry forward.
  if (point.t > t) return series[0].t <= t ? series[0].p : null
  return point.p
}

export async function fetchPortfolioChart(tokens: TokenInfo[], days: number): Promise<ChartData> {
  const symbolToId: Record<string, string> = {}
  for (const t of tokens) {
    const id = COINGECKO_IDS[t.symbol]
    if (id) symbolToId[t.symbol] = id
  }
  const uniqueIds = [...new Set(Object.values(symbolToId))]
  if (uniqueIds.length === 0) uniqueIds.push('ethereum')

  const settled = await Promise.all(
    uniqueIds.map(async id => {
      try {
        return [id, await fetchCoinGeckoChart(id, days)] as const
      } catch {
        return [id, [] as PricePoint[]] as const
      }
    }),
  )
  const seriesMap: Record<string, PricePoint[]> = Object.fromEntries(settled)

  // Reference timeline = the densest series we actually got back.
  let refPoints: PricePoint[] = []
  for (const id of uniqueIds) {
    const s = seriesMap[id]
    if (s && s.length > refPoints.length) refPoints = s
  }
  if (refPoints.length === 0) return { timestamps: [], values: [] }

  const timestamps = refPoints.map(p => p.t)
  const values = new Array<number>(timestamps.length).fill(0)

  for (const t of tokens) {
    const id = symbolToId[t.symbol]
    const series = id ? seriesMap[id] : undefined
    if (!series || series.length === 0) continue

    const amount = parseFloat(t.balance)
    if (!Number.isFinite(amount) || amount <= 0) continue

    const cursor = { i: 0 }
    for (let i = 0; i < timestamps.length; i++) {
      const price = priceAt(series, timestamps[i], cursor)
      if (price !== null) values[i] += price * amount
    }
  }

  return { timestamps, values }
}

export { COINGECKO_IDS }
