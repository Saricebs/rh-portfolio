import { NextRequest, NextResponse } from 'next/server'

const CG_API = 'https://api.coingecko.com/api/v3'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const days = req.nextUrl.searchParams.get('days') || '7'
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const url = `${CG_API}/coins/${id}/market_chart?vs_currency=usd&days=${days}`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 120 },
  })
  if (!res.ok) return NextResponse.json({ error: `CoinGecko ${res.status}` }, { status: res.status })

  const data = await res.json()
  return NextResponse.json(data)
}
