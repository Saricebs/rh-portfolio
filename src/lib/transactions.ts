import { MAX_TXS, FETCH_TIMEOUT } from '@/config'
import { fetchWithTimeout, toError, BlockscoutError } from './fetch'

export interface Tx {
  /** Stable, unique React key — a single hash can produce several rows. */
  id: string
  hash: string
  timestamp: number
  from: string
  to: string
  value: string
  tokenSymbol: string
  tokenDecimal: string
  method: TxMethod
  direction: TxDirection
  status: 'ok' | 'error'
  gasUsed: string
  gasPrice: string
}

type TxMethod = 'Swap' | 'Transfer' | 'LP' | 'Bridge' | 'Send' | 'Receive' | 'Contract'
type TxDirection = 'in' | 'out' | 'self'

function guessMethod(input: string, value: string): TxMethod {
  if (!input || input === '0x') return value !== '0' ? 'Transfer' : 'Contract'
  const sig = input.slice(0, 10).toLowerCase()
  const swapSigs = ['0x38ed1739', '0x8803dbee', '0x7ff36ab5', '0x18cbafe5', '0x4a25d94a', '0x5c11d779', '0x414bf389',
    '0x3593564c', '0x6af479b2', '0xc04b8d59', '0xdb3e2198', '0x49404b7c']
  const lpSigs = ['0xf305d719', '0x4c4133cc', '0xe8e33700', '0x0d4c9759', '0x02751cec', '0x441a3e70', '0xf1251e87',
    '0x2195995c', '0x88316456', '0x5b0d5984', '0xac9650d8']
  const bridgeSigs = ['0x4f25e3d0', '0x56591d86', '0x49281e6c', '0x870749e0', '0x8b9e4f93', '0xa2c2ad6e']

  if (swapSigs.includes(sig)) return 'Swap'
  if (lpSigs.includes(sig)) return 'LP'
  if (bridgeSigs.includes(sig)) return 'Bridge'
  return value === '0' ? 'Contract' : 'Transfer'
}

function guessDirection(from: string, to: string, address: string): TxDirection {
  const a = address.toLowerCase()
  const f = (from || '').toLowerCase()
  const t = (to || '').toLowerCase()
  if (f === a && t === a) return 'self'
  if (t === a) return 'in'
  return 'out'
}

interface BsTx {
  hash: string
  timeStamp: string
  from: string
  to: string
  value: string
  isError: string
  gasUsed: string
  gasPrice: string
  input: string
}

interface BsTokenTx {
  hash: string
  timeStamp: string
  from: string
  to: string
  value: string
  tokenSymbol: string
  tokenDecimal: string
  gasUsed: string
  gasPrice: string
  logIndex?: string
}

async function fetchRawTxs(address: string): Promise<BsTx[]> {
  const res = await fetchWithTimeout(
    `/api/blockscout?module=account&action=txlist&address=${address}&sort=desc&limit=${MAX_TXS}`,
    undefined, FETCH_TIMEOUT,
  )
  return parseBsResponse<BsTx>(res, 'blockscout')
}

async function fetchTokenTxs(address: string): Promise<BsTokenTx[]> {
  const res = await fetchWithTimeout(
    `/api/blockscout?module=account&action=tokentx&address=${address}&sort=desc&limit=${MAX_TXS}`,
    undefined, FETCH_TIMEOUT,
  )
  return parseBsResponse<BsTokenTx>(res, 'blockscout')
}

async function parseBsResponse<T>(res: Response, label: string): Promise<T[]> {
  if (!res.ok) throw await toError(res, label)
  const json = await res.json()
  return json.message === 'OK' && Array.isArray(json.result) ? json.result : []
}

function isRateLimited(r: PromiseSettledResult<unknown>): boolean {
  return r.status === 'rejected'
    && r.reason instanceof BlockscoutError
    && (r.reason.status === 429 || r.reason.status === 503)
}

function settledValue<T>(r: PromiseSettledResult<T[]>): T[] {
  return r.status === 'fulfilled' ? r.value : []
}

export async function fetchTransactions(address: string): Promise<Tx[]> {
  const [rawRes, tokenRes] = await Promise.allSettled([
    fetchRawTxs(address),
    fetchTokenTxs(address),
  ])

  // Let rate limiting surface so the caller's stale-cache fallback can engage.
  // Swallowing it here rendered an empty "no transactions" state instead.
  if (isRateLimited(rawRes) || isRateLimited(tokenRes)) {
    throw new BlockscoutError('Blockscout rate limited (429)', 429)
  }
  if (rawRes.status === 'rejected' && tokenRes.status === 'rejected') {
    throw rawRes.reason instanceof Error ? rawRes.reason : new Error('Failed to load transactions')
  }

  const rawTxs = settledValue(rawRes)
  const tokenTxs = settledValue(tokenRes)

  // A token transfer and its parent transaction share a hash. Classify from the
  // parent's calldata so a swap is not flattened into a plain "Transfer".
  const methodByHash = new Map<string, TxMethod>()
  const statusByHash = new Map<string, 'ok' | 'error'>()
  for (const tx of rawTxs) {
    const h = tx.hash.toLowerCase()
    methodByHash.set(h, guessMethod(tx.input || '0x', tx.value))
    statusByHash.set(h, tx.isError === '0' ? 'ok' : 'error')
  }

  const result: Tx[] = []
  const seenHashes = new Set<string>()
  const seenRows = new Set<string>()

  const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'
  for (const tx of tokenTxs) {
    // Skip mint events (from = 0x0000...0000) — they're contract internal
    // events that clutter activity with meaningless "from zero" rows.
    if ((tx.from || '').toLowerCase() === NULL_ADDRESS) continue

    const hash = tx.hash.toLowerCase()
    // One transaction can emit several ERC-20 Transfer events. Keep each leg —
    // they are distinct movements — but give every row its own identity.
    const rowKey = `${hash}:${tx.logIndex ?? ''}:${tx.from}:${tx.to}:${tx.value}:${tx.tokenSymbol}`
    if (seenRows.has(rowKey)) continue
    seenRows.add(rowKey)
    seenHashes.add(hash)

    result.push({
      id: rowKey,
      hash: tx.hash,
      timestamp: parseInt(tx.timeStamp, 10) * 1000,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      tokenSymbol: tx.tokenSymbol || '?',
      tokenDecimal: tx.tokenDecimal || '18',
      method: methodByHash.get(hash) ?? 'Transfer',
      direction: guessDirection(tx.from, tx.to, address),
      status: statusByHash.get(hash) ?? 'ok',
      gasUsed: tx.gasUsed || '0',
      gasPrice: tx.gasPrice || '0',
    })
  }

  for (const tx of rawTxs) {
    const hash = tx.hash.toLowerCase()
    if (seenHashes.has(hash)) continue
    seenHashes.add(hash)

    result.push({
      id: hash,
      hash: tx.hash,
      timestamp: parseInt(tx.timeStamp, 10) * 1000,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      // Native-value movements are ETH in both directions, not just inbound.
      tokenSymbol: tx.value && tx.value !== '0' ? 'ETH' : '',
      tokenDecimal: '18',
      method: methodByHash.get(hash) ?? guessMethod(tx.input || '0x', tx.value),
      direction: guessDirection(tx.from, tx.to, address),
      status: tx.isError === '0' ? 'ok' : 'error',
      gasUsed: tx.gasUsed || '0',
      gasPrice: tx.gasPrice || '0',
    })
  }

  result.sort((a, b) => b.timestamp - a.timestamp)
  // Each source was capped at MAX_TXS independently; cap the merged list too.
  return result.slice(0, MAX_TXS)
}

export function filterTxs(txs: Tx[], typeFilter: string | null, tokenFilter: string | null): Tx[] {
  let filtered = txs
  if (typeFilter && typeFilter !== 'All') {
    filtered = filtered.filter(tx => tx.method === typeFilter)
  }
  if (tokenFilter && tokenFilter !== 'All') {
    // Exact match — a substring test made "ETH" also select every WETH row.
    const target = tokenFilter.toLowerCase()
    filtered = filtered.filter(tx => (tx.tokenSymbol || '').toLowerCase() === target)
  }
  return filtered
}
