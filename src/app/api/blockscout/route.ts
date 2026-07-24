import { NextRequest, NextResponse } from 'next/server'

const BS_API = 'https://robinhoodchain.blockscout.com/api'

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')
  if (!address) return NextResponse.json({ error: 'missing address' }, { status: 400 })

  const module = req.nextUrl.searchParams.get('module') || 'account'
  const action = req.nextUrl.searchParams.get('action') || 'txlist'
  const sort = req.nextUrl.searchParams.get('sort') || 'desc'
  const limit = req.nextUrl.searchParams.get('limit') || '30'

  const url = `${BS_API}?module=${module}&action=${action}&address=${address}&sort=${sort}&limit=${limit}`
  const res = await fetch(url, {
    next: { revalidate: 120 },
  })
  if (!res.ok) return NextResponse.json({ error: `Blockscout ${res.status}` }, { status: res.status })

  const data = await res.json()
  return NextResponse.json(data)
}
