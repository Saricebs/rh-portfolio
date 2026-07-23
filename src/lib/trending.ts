import { fetchPrices } from './chain'

export interface TrendingToken {
  symbol: string
  name: string
  image: string
  priceUsd: number
  priceChange24h: number
  volume24h: number
  marketCap: number
  coinGeckoId: string
  score: number  // composite score
  volumeScore: number
  marketCapScore: number
  changeScore: number
}

const COINGECKO_URL = 'https://api.coingecko.com/api/v3'

// Normalize value -> 0-100 score
function norm(val: number, max: number): number {
  return max > 0 ? Math.min(100, (val / max) * 100) : 0
}

export async function fetchTrending(): Promise<TrendingToken[]> {
  // Fetch CoinGecko Robinhood Ecosystem tokens sorted by volume
  const url = `${COINGECKO_URL}/coins/markets?vs_currency=usd&category=robinhood-ecosystem&order=volume_desc&per_page=50&sparkline=false`
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
  if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`)

  const data = await res.json()

  // Compute raw values
  const items = data.map((c: any) => ({
    symbol: (c.symbol || '?').toUpperCase(),
    name: c.name || '?',
    image: c.image || '',
    priceUsd: c.current_price || 0,
    volume24h: c.total_volume || 0,
    marketCap: c.market_cap || 0,
    priceChange24h: c.price_change_percentage_24h || 0,
    coinGeckoId: c.id || '',
  }))

  // Compute scores
  const maxVol = Math.max(...items.map((i: any) => i.volume24h), 1)
  const maxMc = Math.max(...items.map((i: any) => i.marketCap), 1)

  return items
    .map((i: any) => {
      const volumeScore = norm(i.volume24h, maxVol)
      const marketCapScore = norm(i.marketCap, maxMc)
      // Change score: positive change = good, normalized to 0-100
      const changeScore = Math.min(100, Math.max(0, (i.priceChange24h + 100) / 2))
      // Composite: volume 40%, mc 35%, price change 25%
      const score = volumeScore * 0.40 + marketCapScore * 0.35 + changeScore * 0.25

      return {
        ...i,
        score: Math.round(score * 10) / 10,
        volumeScore: Math.round(volumeScore),
        marketCapScore: Math.round(marketCapScore),
        changeScore: Math.round(changeScore),
      }
    })
    .filter((i: any) => i.volume24h > 0 || i.marketCap > 0)  // Remove empty tokens
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 25)
}
