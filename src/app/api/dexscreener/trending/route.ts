import { NextResponse } from 'next/server'
import { FETCH_TIMEOUT, DEXSCREENER_BATCH, REVALIDATE_TRENDING } from '@/config'
import { rateLimitResponse } from '@/lib/rateLimit'

interface DexProfile {
  tokenAddress: string
  chainId: string
  icon?: string
  description?: string
  links?: { label?: string; type?: string; url: string }[]
}

interface DexPair {
  chainId: string
  dexId: string
  url: string
  pairAddress: string
  baseToken: { address: string; name: string; symbol: string }
  quoteToken: { address: string; name: string; symbol: string }
  priceUsd: string
  priceChange: { h24: number }
  volume: { h24: number }
  liquidity: { usd: number }
  marketCap: number
  fdv: number
  txns: { h24: { buys: number; sells: number } }
}

interface TrendingItem {
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

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  // Every other route opts into the Next fetch cache; this one did not, so each
  // page view hit DexScreener twice uncached.
  const res = await fetch(url, {
    signal,
    headers: { 'Accept': 'application/json' },
    next: { revalidate: REVALIDATE_TRENDING },
  })
  if (!res.ok) throw new Error(`DexScreener ${res.status}`)
  return res.json()
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function GET(req: Request) {
  const limited = rateLimitResponse(req, 'dex-trending')
  if (limited) return limited

  const urlObj = new URL(req.url)
  for (const key of urlObj.searchParams.keys()) {
    return NextResponse.json({ error: 'Unknown parameter', code: 'INVALID_PARAM' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  const signal = controller.signal

  try {
    // 1. Fetch latest token profiles
    const profiles: DexProfile[] = await fetchJson(
      'https://api.dexscreener.com/token-profiles/latest/v1',
      signal,
    )

    // 2. Filter for Robinhood chain
    const rhProfiles = profiles.filter(p => p.chainId === 'robinhood')
    if (rhProfiles.length === 0) {
      return NextResponse.json([])
    }

    // 3. Batch fetch pair data. The endpoint accepts at most
    // DEXSCREENER_BATCH comma-separated addresses, so chunk rather than
    // sending one oversized URL that fails the whole request.
    const batches = chunk(rhProfiles.map(p => p.tokenAddress), DEXSCREENER_BATCH)
    const batchResults = await Promise.all(
      batches.map(async batch => {
        try {
          const data: { pairs: DexPair[] } = await fetchJson(
            `https://api.dexscreener.com/latest/dex/tokens/${batch.join(',')}`,
            signal,
          )
          return data.pairs ?? []
        } catch {
          // One bad batch shouldn't blank the whole leaderboard.
          return [] as DexPair[]
        }
      }),
    )
    const allPairs = batchResults.flat()

    // 4. Build lookup: tokenAddress → best (highest liq) pair
    const bestPair = new Map<string, DexPair>()
    for (const pair of allPairs) {
      const addr = pair.baseToken.address.toLowerCase()
      const existing = bestPair.get(addr)
      if (!existing || (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)) {
        bestPair.set(addr, pair)
      }
    }

    // 5. Build profile lookup
    const profileMap = new Map<string, DexProfile>()
    for (const p of rhProfiles) {
      profileMap.set(p.tokenAddress.toLowerCase(), p)
    }

    // 6. Merge + score
    const items: TrendingItem[] = []
    for (const [addr, pair] of bestPair) {
      const profile = profileMap.get(addr)
      const bt = pair.baseToken
      const vol24h = pair.volume?.h24 ?? 0
      const liq = pair.liquidity?.usd ?? 0
      if (vol24h <= 0 && liq <= 0) continue

      items.push({
        symbol: bt.symbol,
        name: bt.name,
        image: profile?.icon ?? '',
        priceUsd: parseFloat(pair.priceUsd) || 0,
        priceChange24h: pair.priceChange?.h24 ?? 0,
        volume24h: vol24h,
        marketCap: pair.marketCap ?? 0,
        fdv: pair.fdv ?? 0,
        liquidity: liq,
        pairAddress: pair.pairAddress,
        tokenAddress: addr,
        url: pair.url,
        txns24h: pair.txns?.h24 ?? { buys: 0, sells: 0 },
        score: 0,
      })
    }

    // Score: weighted combo of volume (40%), liquidity (30%), volume/liq ratio (15%), txns (15%)
    const maxVol = Math.max(...items.map(i => i.volume24h), 1)
    const maxLiq = Math.max(...items.map(i => i.liquidity), 1)
    for (const item of items) {
      const volScore = item.volume24h / maxVol
      const liqScore = item.liquidity / maxLiq
      const ratioScore = item.liquidity > 0 ? Math.min(item.volume24h / item.liquidity / 5, 1) : 0
      // Clamp: an unclamped txn term let one very busy pair exceed its 15%
      // weight and dominate the ranking.
      const txnScore = Math.min((item.txns24h.buys + item.txns24h.sells) / 2000, 1)
      item.score = Math.round((volScore * 0.40 + liqScore * 0.30 + ratioScore * 0.15 + txnScore * 0.15) * 1000) / 10
    }

    items.sort((a, b) => b.score - a.score)

    return NextResponse.json(items.slice(0, 25), {
      headers: { 'Cache-Control': `public, max-age=0, s-maxage=${REVALIDATE_TRENDING}` },
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out', code: 'TIMEOUT' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Failed to fetch trending', code: 'NETWORK_ERROR' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
