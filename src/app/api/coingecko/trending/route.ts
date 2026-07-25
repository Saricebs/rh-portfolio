import { COINGECKO_API, COINGECKO_CATEGORY, REVALIDATE_BLOCKSCOUT } from '@/config'
import { NextResponse } from 'next/server'

export async function GET() {
  const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&category=${COINGECKO_CATEGORY}&order=volume_desc&per_page=50&sparkline=false`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: REVALIDATE_BLOCKSCOUT },
  })
  if (!res.ok) return NextResponse.json({ error: `CoinGecko ${res.status}` }, { status: res.status })

  const data = await res.json()
  return NextResponse.json(data)
}
