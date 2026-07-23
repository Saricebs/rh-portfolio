const CHAIN = 'robinhood'

export interface TokenTrend {
  symbol: string
  name: string
  address: string
  priceUsd: number
  priceNative: number
  volume24h: number
  txnsBuys24h: number
  txnsSells24h: number
  liquidity: number
  marketCap: number
  priceChange24h: number
  pairCreatedAt: number
  pairAddress: string
  url: string
}

export interface TrendingStats {
  mostBought: TokenTrend[]
  mostSold: TokenTrend[]
  highestVolume: TokenTrend[]
  newestTokens: TokenTrend[]
}

export async function fetchTrendingTokens(): Promise<TrendingStats> {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/search?q=${CHAIN}`
  )
  if (!res.ok) throw new Error(`DexScreener ${res.status}`)
  const data = await res.json()
  const pairs = (data.pairs || []).filter(
    (p: { chainId: string }) => p.chainId === CHAIN
  )

  const mapped: TokenTrend[] = pairs.map((p: {
    baseToken: { symbol: string; name: string; address: string }
    quoteToken: { symbol: string }
    priceUsd: string
    priceNative: string
    volume: { h24: number }
    txns: { h24: { buys: number; sells: number } }
    liquidity: { usd: number }
    marketCap: number
    priceChange: { h24: number }
    pairCreatedAt: number
    pairAddress: string
    url: string
  }) => ({
    symbol: p.baseToken.symbol,
    name: p.baseToken.name,
    address: p.baseToken.address,
    priceUsd: parseFloat(p.priceUsd || '0'),
    priceNative: parseFloat(p.priceNative || '0'),
    volume24h: p.volume?.h24 || 0,
    txnsBuys24h: p.txns?.h24?.buys || 0,
    txnsSells24h: p.txns?.h24?.sells || 0,
    liquidity: p.liquidity?.usd || 0,
    marketCap: p.marketCap || 0,
    priceChange24h: p.priceChange?.h24 || 0,
    pairCreatedAt: p.pairCreatedAt || 0,
    pairAddress: p.pairAddress,
    url: p.url,
  }))

  // Deduplicate by base token address
  const seen = new Set<string>()
  const unique: TokenTrend[] = []
  for (const t of mapped) {
    if (seen.has(t.address)) continue
    seen.add(t.address)
    unique.push(t)
  }

  return {
    mostBought: [...unique].sort((a, b) => b.txnsBuys24h - a.txnsBuys24h).slice(0, 5),
    mostSold: [...unique].sort((a, b) => b.txnsSells24h - a.txnsSells24h).slice(0, 5),
    highestVolume: [...unique].sort((a, b) => b.volume24h - a.volume24h).slice(0, 5),
    newestTokens: [...unique].sort((a, b) => b.pairCreatedAt - a.pairCreatedAt).slice(0, 5),
  }
}
