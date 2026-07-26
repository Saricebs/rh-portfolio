import { NextRequest, NextResponse } from 'next/server'
import { COINGECKO_API, REVALIDATE_PRICES, FETCH_TIMEOUT } from '@/config'
import { rateLimitResponse } from '@/lib/rateLimit'

const ALLOWED_IDS = new Set(['ethereum', 'global-dollar', 'usd-coin'])
const ALLOWED_PARAMS = new Set(['ids'])

export async function GET(req: NextRequest) {
  const limited = rateLimitResponse(req, 'cg-prices')
  if (limited) return limited

  const params = req.nextUrl.searchParams
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      return NextResponse.json({ error: 'Unknown parameter', code: 'INVALID_PARAM' }, { status: 400 })
    }
  }

  const idsParam = params.get('ids')
  if (!idsParam) return NextResponse.json({ error: 'Missing ids parameter', code: 'MISSING_IDS' }, { status: 400 })

  const ids = idsParam.split(',').filter(id => ALLOWED_IDS.has(id))
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No valid coin IDs provided', code: 'NO_VALID_IDS' }, { status: 400 })
  }

  const url = `${COINGECKO_API}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      next: { revalidate: REVALIDATE_PRICES },
    })
    if (!res.ok) {
      return NextResponse.json({ error: `CoinGecko ${res.status}`, code: 'UPSTREAM_ERROR' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': `public, max-age=0, s-maxage=${REVALIDATE_PRICES}` },
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out', code: 'TIMEOUT' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Upstream request failed', code: 'NETWORK_ERROR' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
