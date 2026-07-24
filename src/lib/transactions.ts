const API = 'https://robinhoodchain.blockscout.com/api'

export interface Tx {
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

// Method signatures from Blockscout input
function guessMethod(input: string, value: string): TxMethod {
  if (!input || input === '0x') return value !== '0' ? 'Transfer' : 'Contract'
  const sig = input.slice(0, 10).toLowerCase()
  const swapSigs = ['0x38ed1739', '0x8803dbee', '0x7ff36ab5', '0x18cbafe5', '0x4a25d94a', '0x5c11d779', '0x414bf389',
    '0x3593564c', '0x6af479b2', '0xc04b8d59', '0xdb3e2198', '0x49404b7c']
  const lpSigs = ['0xf305d719', '0x4c4133cc', '0xe8e33700', '0x0d4c9759', '0x02751cec', '0x441a3e70', '0xf1251e87',
    '0x2195995c', '0x88316456', '0x5b0d5984', '0xac9650d8', '0x88316456']
  const bridgeSigs = ['0x4f25e3d0', '0x56591d86', '0x49281e6c', '0x870749e0', '0x8b9e4f93', '0xa2c2ad6e']

  if (swapSigs.includes(sig)) return 'Swap'
  if (lpSigs.includes(sig)) return 'LP'
  if (bridgeSigs.includes(sig)) return 'Bridge'
  return value === '0' ? 'Contract' : 'Transfer'
}

function guessDirection(from: string, to: string, address: string): TxDirection {
  const a = address.toLowerCase()
  const f = from.toLowerCase()
  const t = to.toLowerCase()
  if (f === a && t === a) return 'self'
  if (t === a) return 'in'
  return 'out'
}

// ── Blockscout types ──
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
  contractAddress: string
}

interface BsTokenTx {
  hash: string
  timeStamp: string
  from: string
  to: string
  value: string
  tokenSymbol: string
  tokenName: string
  tokenDecimal: string
  gasUsed: string
  gasPrice: string
}

// ── Fetch normal txs (ETH transfers + contract interactions) ──
async function fetchRawTxs(address: string): Promise<BsTx[]> {
  const url = `${API}?module=account&action=txlist&address=${address}&sort=desc&limit=30`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Blockscout txlist ${res.status}`)
  const json = await res.json()
  return json.message === 'OK' && Array.isArray(json.result) ? json.result : []
}

// ── Fetch token transfers (ERC20) ──
async function fetchTokenTxs(address: string): Promise<BsTokenTx[]> {
  const url = `${API}?module=account&action=tokentx&address=${address}&sort=desc&limit=30`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Blockscout tokentx ${res.status}`)
  const json = await res.json()
  return json.message === 'OK' && Array.isArray(json.result) ? json.result : []
}

const MAX_TXS = 30

export async function fetchTransactions(address: string): Promise<Tx[]> {
  const [rawTxs, tokenTxs] = await Promise.all([
    fetchRawTxs(address).catch(() => [] as BsTx[]),
    fetchTokenTxs(address).catch(() => [] as BsTokenTx[]),
  ])

  const seenHashes = new Set<string>()
  const result: Tx[] = []

  // Process token transfers first (richer data) — capped
  for (const tx of tokenTxs.slice(0, MAX_TXS)) {
    seenHashes.add(tx.hash)
    const direction = guessDirection(tx.from, tx.to, address)
    result.push({
      hash: tx.hash,
      timestamp: parseInt(tx.timeStamp) * 1000,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      tokenSymbol: tx.tokenSymbol || '?',
      tokenDecimal: tx.tokenDecimal || '18',
      method: 'Transfer',
      direction,
      status: 'ok',
      gasUsed: tx.gasUsed || '0',
      gasPrice: tx.gasPrice || '0',
    })
  }

  // Process raw txs (ETH transfers + contract calls) — capped, deduped
  for (const tx of rawTxs.slice(0, MAX_TXS)) {
    if (seenHashes.has(tx.hash)) continue
    seenHashes.add(tx.hash)
    const direction = guessDirection(tx.from, tx.to, address)
    const method = guessMethod(tx.input || '0x', tx.value)
    result.push({
      hash: tx.hash,
      timestamp: parseInt(tx.timeStamp) * 1000,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      tokenSymbol: method === 'Transfer' && direction === 'in' ? 'ETH' : '',
      tokenDecimal: '18',
      method,
      direction,
      status: tx.isError === '0' ? 'ok' : 'error',
      gasUsed: tx.gasUsed || '0',
      gasPrice: tx.gasPrice || '0',
    })
  }

  // Sort by timestamp desc
  result.sort((a, b) => b.timestamp - a.timestamp)
  return result
}

export function filterTxs(txs: Tx[], typeFilter: string | null, tokenFilter: string | null): Tx[] {
  let filtered = txs
  if (typeFilter && typeFilter !== 'All') {
    filtered = filtered.filter(tx => tx.method === typeFilter)
  }
  if (tokenFilter && tokenFilter !== 'All') {
    filtered = filtered.filter(tx => {
      const sym = tx.tokenSymbol?.toLowerCase() || ''
      return sym.includes(tokenFilter.toLowerCase())
    })
  }
  return filtered
}
