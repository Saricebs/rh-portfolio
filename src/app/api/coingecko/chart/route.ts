import { NextRequest, NextResponse } from 'next/server'
import { COINGECKO_API, REVALIDATE_BLOCKSCOUT } from '@/config'

const ALLOWED_IDS = new Set([
  'ethereum', 'global-dollar', 'usd-coin',
])
const ALLOWED_DAYS = new Set(['1', '7', '30', '90', '365'])

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const days = req.nextUrl.searchParams.get('days') || '7'

  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  if (!ALLOWED_IDS.has(id)) {
    return NextResponse.json({ error: `invalid id: ${id}` }, { status: 400 })
  }
  if (!ALLOWED_DAYS.has(days)) {
    return NextResponse.json({ error: `invalid days: ${days}` }, { status: 400 })
  }

  const url = `${COINGECKO_API}/coins/${id}/market_chart?vs_currency=usd&days=${days}`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: REVALIDATE_BLOCKSCOUT },
  })
  if (!res.ok) return NextResponse.json({ error: `CoinGecko ${res.status}` }, { status: res.status })

  const data = await res.json()
  return NextResponse.json(data)
}
