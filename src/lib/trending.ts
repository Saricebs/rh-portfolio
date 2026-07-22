export interface TrendingToken {
  symbol: string
  name: string
  image: string
  priceUsd: number
  volume24h: number
  marketCap: number
  priceChange24h: number
  coinGeckoId: string
}

const COINGECKO_URL = 'https://api.coingecko.com/api/v3'

export async function fetchTrending(): Promise<TrendingToken[]> {
  const url = `${COINGECKO_URL}/coins/markets?vs_currency=usd&category=robinhood-ecosystem&order=volume_desc&per_page=25&sparkline=false`
  
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    // Next.js fetch cache — fresh every 60s
    next: { revalidate: 60 },
  })
  
  if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`)
  
  const data = await res.json()
  
  return data.map((c: any) => ({
    symbol: c.symbol?.toUpperCase() || '?',
    name: c.name || '?',
    image: c.image || '',
    priceUsd: c.current_price || 0,
    volume24h: c.total_volume || 0,
    marketCap: c.market_cap || 0,
    priceChange24h: c.price_change_percentage_24h || 0,
    coinGeckoId: c.id || '',
  }))
}
