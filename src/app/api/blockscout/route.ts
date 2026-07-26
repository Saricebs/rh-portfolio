import { NextRequest, NextResponse } from 'next/server'
import { BLOCKSCOUT_API, BLOCKSCOUT_API_KEY, REVALIDATE_BLOCKSCOUT, FETCH_TIMEOUT } from '@/config'
import { isAddress } from 'ethers'

const ALLOWED_MODULES = new Set(['account'])
const ALLOWED_ACTIONS = new Set(['txlist', 'tokentx'])
const ALLOWED_SORT = new Set(['asc', 'desc'])
const ALLOWED_PARAMS = new Set(['address', 'module', 'action', 'sort', 'limit'])
const MAX_LIMIT = 100

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams

  // Reject unknown params
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      return NextResponse.json({ error: 'Unknown parameter', code: 'INVALID_PARAM' }, { status: 400 })
    }
  }

  const address = params.get('address')
  if (!address) return NextResponse.json({ error: 'Missing address parameter', code: 'MISSING_ADDRESS' }, { status: 400 })
  if (!isAddress(address)) return NextResponse.json({ error: 'Invalid address format', code: 'INVALID_ADDRESS' }, { status: 400 })
  if (address.toLowerCase() !== address) {
    // Normalized checksum address? Accept both but isAddress handles checksum
  }

  const mod = params.get('module') || 'account'
  const action = params.get('action') || 'txlist'
  const sort = params.get('sort') || 'desc'
  const limit = params.get('limit') || '30'

  if (!ALLOWED_MODULES.has(mod)) {
    return NextResponse.json({ error: `Invalid module: ${mod}`, code: 'INVALID_MODULE' }, { status: 400 })
  }
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: `Invalid action: ${action}`, code: 'INVALID_ACTION' }, { status: 400 })
  }
  if (!ALLOWED_SORT.has(sort)) {
    return NextResponse.json({ error: `Invalid sort: ${sort}`, code: 'INVALID_SORT' }, { status: 400 })
  }
  const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 30), MAX_LIMIT)

  const url = `${BLOCKSCOUT_API}?module=${mod}&action=${action}&address=${address}&sort=${sort}&limit=${parsedLimit}&apikey=${BLOCKSCOUT_API_KEY}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: REVALIDATE_BLOCKSCOUT },
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Blockscout ${res.status}`, code: 'UPSTREAM_ERROR' }, { status: res.status })
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
