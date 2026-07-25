import { FETCH_TIMEOUT } from '@/config'
import { fetchWithTimeout, toError } from './fetch'

export interface TrendingToken {
  symbol: string
  name: string
  image: string
  priceUsd: number
  priceChange24h: number
  volume24h: number
  marketCap: number
  fdv: number
  liquidity: number
  pairAddress: string
  tokenAddress: string
  url: string
  txns24h: { buys: number; sells: number }
  score: number
}

export async function fetchTrending(): Promise<TrendingToken[]> {
  const res = await fetchWithTimeout('/api/dexscreener/trending', undefined, FETCH_TIMEOUT)
  if (!res.ok) throw await toError(res, 'dexscreener')

  const data: TrendingToken[] = await res.json()
  return data
}
