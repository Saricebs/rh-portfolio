import { NextResponse } from 'next/server'
import { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX } from '@/config'

/**
 * Fixed-window limiter, per serverless instance.
 *
 * This is deliberately modest: on Vercel each lambda instance keeps its own
 * counter, so the effective global limit is (instances x RATE_LIMIT_MAX). It is
 * enough to stop a single client trivially draining BLOCKSCOUT_API_KEY quota or
 * the CoinGecko free tier. For a hard global guarantee, back this with Upstash
 * Redis / Vercel KV and keep the same call signature.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_TRACKED_KEYS = 10_000

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function clientKey(req: Request): string {
  const h = req.headers
  const fwd = h.get('x-forwarded-for')
  const ip =
    (fwd ? fwd.split(',')[0]?.trim() : '') ||
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    'unknown'
  return ip
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(req: Request, scope: string): RateLimitResult {
  const now = Date.now()
  if (buckets.size > MAX_TRACKED_KEYS) sweep(now)

  const key = `${scope}:${clientKey(req)}`
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW
    buckets.set(key, { count: 1, resetAt })
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, resetAt }
  }

  existing.count++
  return {
    ok: existing.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - existing.count),
    resetAt: existing.resetAt,
  }
}

/** Returns a 429 response when the caller is over budget, otherwise null. */
export function rateLimitResponse(req: Request, scope: string): NextResponse | null {
  const result = checkRateLimit(req, scope)
  if (result.ok) return null

  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Too many requests', code: 'RATE_LIMITED' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'RateLimit-Limit': String(RATE_LIMIT_MAX),
        'RateLimit-Remaining': '0',
        'RateLimit-Reset': String(retryAfter),
      },
    },
  )
}
