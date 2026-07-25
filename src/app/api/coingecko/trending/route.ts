import { COINGECKO_API, COINGECKO_CATEGORY, REVALIDATE_BLOCKSCOUT, FETCH_TIMEOUT } from '@/config'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const urlObj = new URL(req.url)
  for (const key of urlObj.searchParams.keys()) {
    return NextResponse.json({ error: 'Unknown parameter', code: 'INVALID_PARAM' }, { status: 400 })
  }

  const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&category=${COINGECKO_CATEGORY}&order=volume_desc&per_page=50&sparkline=false`
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
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out', code: 'TIMEOUT' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Upstream request failed', code: 'NETWORK_ERROR' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
