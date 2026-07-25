import { NextRequest, NextResponse } from 'next/server'
import { COINGECKO_API, REVALIDATE_PRICES } from '@/config'

// CoinGecko IDs must match known token list — allowlist
const ALLOWED_IDS = new Set([
  'ethereum', 'global-dollar', 'usd-coin',
])

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids')
  if (!idsParam) return NextResponse.json({ error: 'missing ids' }, { status: 400 })

  const ids = idsParam.split(',').filter(id => ALLOWED_IDS.has(id))
  if (ids.length === 0) {
    return NextResponse.json({ error: 'no valid ids' }, { status: 400 })
  }

  const url = `${COINGECKO_API}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: REVALIDATE_PRICES },
  })
  if (!res.ok) return NextResponse.json({ error: `CoinGecko ${res.status}` }, { status: res.status })

  const data = await res.json()
  return NextResponse.json(data)
}
