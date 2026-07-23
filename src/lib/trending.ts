export interface TrendingToken {
  symbol: string
  name: string
  image: string
  priceUsd: number
  priceChange24h: number
  volume24h: number
  marketCap: number
  coinGeckoId: string
  score: number
  volumeScore: number
  marketCapScore: number
  changeScore: number
}

interface CoinGeckoToken {
  symbol?: string
  name?: string
  image?: string
  current_price?: number
  total_volume?: number
  market_cap?: number
  price_change_percentage_24h?: number
  id?: string
}

const COINGECKO_URL = 'https://api.coingecko.com/api/v3'

function norm(val: number, max: number): number {
  return max > 0 ? Math.min(100, (val / max) * 100) : 0
}

function toToken(c: CoinGeckoToken): TrendingToken {
  const symbol = (c.symbol || '?').toUpperCase()
  const name = c.name || '?'
  const image = c.image || ''
  const priceUsd = c.current_price || 0
  const volume24h = c.total_volume || 0
  const marketCap = c.market_cap || 0
  const priceChange24h = c.price_change_percentage_24h || 0
  const coinGeckoId = c.id || ''
  return { symbol, name, image, priceUsd, priceChange24h, volume24h, marketCap, coinGeckoId, score: 0, volumeScore: 0, marketCapScore: 0, changeScore: 0 }
}

export async function fetchTrending(): Promise<TrendingToken[]> {
  const url = `${COINGECKO_URL}/coins/markets?vs_currency=usd&category=robinhood-ecosystem&order=volume_desc&per_page=50&sparkline=false`
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
  if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`)

  const data: CoinGeckoToken[] = await res.json()
  const items = data.map(toToken)

  const maxVol = Math.max(...items.map(i => i.volume24h), 1)
  const maxMc = Math.max(...items.map(i => i.marketCap), 1)

  return items
    .map(i => {
      const volumeScore = norm(i.volume24h, maxVol)
      const marketCapScore = norm(i.marketCap, maxMc)
      const changeScore = Math.min(100, Math.max(0, (i.priceChange24h + 100) / 2))
      const score = volumeScore * 0.40 + marketCapScore * 0.35 + changeScore * 0.25

      return {
        ...i,
        score: Math.round(score * 10) / 10,
        volumeScore: Math.round(volumeScore),
        marketCapScore: Math.round(marketCapScore),
        changeScore: Math.round(changeScore),
      }
    })
    .filter(i => i.volume24h > 0 || i.marketCap > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
}
