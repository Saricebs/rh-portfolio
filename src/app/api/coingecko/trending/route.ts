import { NextRequest, NextResponse } from 'next/server'

const CG_API = 'https://api.coingecko.com/api/v3'

export async function GET(_req: NextRequest) {
  const url = `${CG_API}/coins/markets?vs_currency=usd&category=robinhood-ecosystem&order=volume_desc&per_page=50&sparkline=false`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 120 },
  })
  if (!res.ok) return NextResponse.json({ error: `CoinGecko ${res.status}` }, { status: res.status })

  const data = await res.json()
  return NextResponse.json(data)
}
