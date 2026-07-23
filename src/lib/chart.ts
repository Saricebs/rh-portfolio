import { TokenInfo } from './chain'

const COINGECKO_ID: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'ethereum',
  USDG: 'global-dollar',
  USDC: 'usd-coin',
}

interface PricePoint { t: number; p: number }

const cache: Record<string, { data: PricePoint[]; at: number }> = {}
const TTL = 120_000

async function fetchCoinGeckoChart(id: string, days: number): Promise<PricePoint[]> {
  const key = `${id}-${days}`
  const cached = cache[key]
  if (cached && Date.now() - cached.at < TTL) return cached.data

  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko chart ${res.status}`)
  const json = await res.json()

  const points: PricePoint[] = (json.prices || []).map(([t, p]: [number, number]) => ({ t, p }))
  cache[key] = { data: points, at: Date.now() }
  return points
}

export interface ChartData {
  timestamps: number[]
  values: number[]
  change24h: number
  change7d: number
  change30d: number
}

export async function fetchPortfolioChart(tokens: TokenInfo[], days: number): Promise<ChartData> {
  // Map each held token to its CoinGecko id
  const symbolToId: Record<string, string> = {}
  for (const t of tokens) {
    const id = COINGECKO_ID[t.symbol]
    if (id) symbolToId[t.symbol] = id
  }
  const uniqueIds = [...new Set(Object.values(symbolToId))]
  if (uniqueIds.length === 0) uniqueIds.push('ethereum')

  // Fetch price series for each unique id
  const seriesMap: Record<string, PricePoint[]> = {}
  for (const id of uniqueIds) {
    try { seriesMap[id] = await fetchCoinGeckoChart(id, days) } catch { /* skip */ }
  }

  // Find the longest series to use as reference timeline
  let refPoints: PricePoint[] = []
  for (const id of uniqueIds) {
    if (seriesMap[id] && seriesMap[id].length > refPoints.length) {
      refPoints = seriesMap[id]
    }
  }
  if (refPoints.length === 0) {
    return { timestamps: [], values: [], change24h: 0, change7d: 0, change30d: 0 }
  }

  // Aggregate weighted portfolio value per point
  const timestamps = refPoints.map(p => p.t)
  const values = new Array(refPoints.length).fill(0)

  for (const t of tokens) {
    const id = symbolToId[t.symbol]
    if (!id || !seriesMap[id]) continue
    const weight = parseFloat(t.balance)
    if (weight <= 0) continue
    const series = seriesMap[id]
    for (let i = 0; i < refPoints.length; i++) {
      values[i] += (series[i]?.p || 0) * weight
    }
  }

  const len = values.length
  const change24h = len > 1 ? ((values[len - 1] - values[0]) / values[0]) * 100 : 0
  const dayStep = Math.max(1, Math.floor(len / days))
  const idx7d = Math.min(len - 1, dayStep * 7)
  const idx30d = 0
  const change7d = len > 1 ? ((values[len - 1] - values[idx7d]) / values[idx7d]) * 100 : 0
  const change30d = len > 1 ? ((values[len - 1] - values[idx30d]) / values[idx30d]) * 100 : 0

  return { timestamps, values, change24h, change7d, change30d }
}
