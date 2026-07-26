import { NextRequest, NextResponse } from 'next/server'
import { COINGECKO_API, REVALIDATE_BLOCKSCOUT, FETCH_TIMEOUT } from '@/config'
import { rateLimitResponse } from '@/lib/rateLimit'

const ALLOWED_IDS = new Set(['ethereum', 'global-dollar', 'usd-coin'])
const ALLOWED_DAYS = new Set(['1', '7', '30', '90', '365'])
const ALLOWED_PARAMS = new Set(['id', 'days'])

export async function GET(req: NextRequest) {
  const limited = rateLimitResponse(req, 'cg-chart')
  if (limited) return limited

  const params = req.nextUrl.searchParams
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      return NextResponse.json({ error: 'Unknown parameter', code: 'INVALID_PARAM' }, { status: 400 })
    }
  }

  const id = params.get('id')
  const days = params.get('days') || '7'

  if (!id) return NextResponse.json({ error: 'Missing id parameter', code: 'MISSING_ID' }, { status: 400 })
  if (!ALLOWED_IDS.has(id)) {
    return NextResponse.json({ error: 'Invalid coin ID', code: 'INVALID_ID' }, { status: 400 })
  }
  if (!ALLOWED_DAYS.has(days)) {
    return NextResponse.json({ error: 'Invalid days', code: 'INVALID_DAYS' }, { status: 400 })
  }

  const url = `${COINGECKO_API}/coins/${id}/market_chart?vs_currency=usd&days=${days}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      next: { revalidate: REVALIDATE_BLOCKSCOUT },
    })
    if (!res.ok) {
      return NextResponse.json({ error: `CoinGecko ${res.status}`, code: 'UPSTREAM_ERROR' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': `public, max-age=0, s-maxage=${REVALIDATE_BLOCKSCOUT}` },
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
