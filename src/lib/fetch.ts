// ── Typed API errors + timeout fetch ──
import { FETCH_TIMEOUT } from '@/config'

export class NetworkError extends Error {
  constructor(msg: string, public status?: number) {
    super(msg)
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends Error {
  constructor() {
    super('Request timed out')
    this.name = 'TimeoutError'
  }
}

export class BlockscoutError extends Error {
  constructor(msg: string, public status: number) {
    super(msg)
    this.name = 'BlockscoutError'
  }
}

export class PriceApiError extends Error {
  constructor(msg: string, public status: number) {
    super(msg)
    this.name = 'PriceApiError'
  }
}

export type AppError = NetworkError | TimeoutError | BlockscoutError | PriceApiError | Error

/** fetch with AbortController timeout. Throws typed errors. */
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = FETCH_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    return res
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new TimeoutError()
    }
    throw new NetworkError(e instanceof Error ? e.message : 'Unknown network error')
  } finally {
    clearTimeout(timer)
  }
}

/** Parse typed error category from fetch response */
export async function toError(res: Response, label: string): Promise<AppError> {
  const status = res.status
  if (label === 'blockscout') return new BlockscoutError(`Blockscout ${status}`, status)
  if (label === 'coingecko') return new PriceApiError(`CoinGecko ${status}`, status)
  return new Error(`${label} ${status}`)
}
