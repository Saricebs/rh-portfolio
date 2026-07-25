import { NextRequest, NextResponse } from 'next/server'
import { BLOCKSCOUT_API, REVALIDATE_BLOCKSCOUT } from '@/config'

const ALLOWED_MODULES = new Set(['account'])
const ALLOWED_ACTIONS = new Set(['txlist', 'tokentx'])
const ALLOWED_SORT = new Set(['asc', 'desc'])
const MAX_LIMIT = 100

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const address = params.get('address')
  if (!address) return NextResponse.json({ error: 'missing address' }, { status: 400 })

  const mod = params.get('module') || 'account'
  const action = params.get('action') || 'txlist'
  const sort = params.get('sort') || 'desc'
  const limit = params.get('limit') || '30'

  if (!ALLOWED_MODULES.has(mod)) {
    return NextResponse.json({ error: `invalid module: ${mod}` }, { status: 400 })
  }
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: `invalid action: ${action}` }, { status: 400 })
  }
  if (!ALLOWED_SORT.has(sort)) {
    return NextResponse.json({ error: `invalid sort: ${sort}` }, { status: 400 })
  }
  const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 30), MAX_LIMIT)

  const url = `${BLOCKSCOUT_API}?module=${mod}&action=${action}&address=${address}&sort=${sort}&limit=${parsedLimit}`
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_BLOCKSCOUT },
  })
  if (!res.ok) return NextResponse.json({ error: `Blockscout ${res.status}` }, { status: res.status })

  const data = await res.json()
  return NextResponse.json(data)
}
