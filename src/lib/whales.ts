const API = 'https://robinhoodchain.blockscout.com/api'

export interface WhaleTx {
  hash: string
  type: 'buy' | 'sell' | 'transfer'
  tokenSymbol: string
  tokenAddress: string
  value: number
  valueUsd?: number
  from: string
  to: string
  label?: string
  timestamp: number
  isWhale: boolean
}

export interface WhaleStats {
  biggestBuy: WhaleTx | null
  biggestSell: WhaleTx | null
  newWhale: { address: string; value: number; token: string; timestamp: number } | null
  topWhale: [string, { buys: number; sells: number; value: number }] | null
  totalWhales: number
}

const WHALE_MIN_VALUE: Record<string, number> = {
  WETH: 0.5,    // ~$1k
  USDG: 1000,   // $1k
  USDC: 1000,
  USDT: 1000,
  ETH: 0.5,
}

const WHALE_DEFAULT_MIN = 500 // $500 for unknown tokens

// Known DEX/router addresses on Robinhood Chain
const DEX_ADDRESSES = new Set([
  '0xcaf681a66d020601342297493863e78c959e5cb2', // SwapRouter02
  '0x8876789976decbfcbbbe364623c63652db8c0904', // UniversalRouter
  '0x1f7d7550b1b028f7571e69a784071f0205fd2efa', // Factory
  '0x73991a25c818bf1f1128deaab1492d45638de0d3', // NFPM
  '0x0000000000000000000000000000000000000000', // Burn
].map(a => a.toLowerCase()))

// Addresses we've seen before (for new whale detection)
let seenAddresses = new Set<string>()

function isWhaleSize(symbol: string, value: number): boolean {
  const min = WHALE_MIN_VALUE[symbol]
  if (min) return value >= min
  return value >= WHALE_DEFAULT_MIN
}

function classifyTx(from: string, to: string, isDexAddr: (addr: string) => boolean): WhaleTx['type'] {
  const f = from.toLowerCase()
  const t = to.toLowerCase()
  if (isDexAddr(t) || DEX_ADDRESSES.has(t)) return 'sell'
  if (isDexAddr(f) || DEX_ADDRESSES.has(f)) return 'buy'
  return 'transfer'
}

function addrShort(addr: string): string {
  if (!addr) return '?'
  if (addr === '0x0000000000000000000000000000000000000000') return 'Burn'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ── Fetch token transfers (ERC-20) ──
export async function fetchWhaleActivity(): Promise<WhaleTx[]> {
  const url = `${API}/v2/token-transfers?type=ERC-20&limit=50`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Blockscout ${res.status}`)
  const data = await res.json()
  const items: any[] = data.items || []

  const results: WhaleTx[] = []
  const now = Date.now()

  // For new whale detection, track first-seen addresses
  const sessionAddresses = new Set<string>()

  for (const item of items) {
    const token = item.token || {}
    const total = item.total || {}
    const decimals = parseInt(token.decimals || '18')
    const rawValue = total.value || '0'
    const value = parseFloat(rawValue) / (10 ** decimals)
    const symbol = token.symbol || '?'
    if (value <= 0) continue

    const from = item.from?.hash || ''
    const to = item.to?.hash || ''
    const hash = item.tx_hash || ''
    const timestamp = item.timestamp ? new Date(item.timestamp).getTime() : now

    // Track addresses for new whale detection
    sessionAddresses.add(from.toLowerCase())
    sessionAddresses.add(to.toLowerCase())

    // Check if interacting with known contract
    const toLower = to.toLowerCase()
    const fromLower = from.toLowerCase()
    const interactingWithDex = DEX_ADDRESSES.has(toLower) || DEX_ADDRESSES.has(fromLower)

    // Simulate a basic isDexAddr check — use the set
    const type = classifyTx(from, to, (addr) => DEX_ADDRESSES.has(addr.toLowerCase()))

    const isWhale = isWhaleSize(symbol, value) || (symbol === 'WETH' && value > 0.3)

    if (!isWhale) continue

    // Detect known contract interactions for labels
    let label: string | undefined
    if (interactingWithDex) label = 'DEX'

    results.push({
      hash,
      type,
      tokenSymbol: symbol,
      tokenAddress: token.address || '',
      value,
      from: addrShort(from),
      to: addrShort(to),
      label,
      timestamp,
      isWhale,
    })
  }

  // Update global seen set
  for (const addr of sessionAddresses) {
    seenAddresses.add(addr)
  }

  results.sort((a, b) => b.timestamp - a.timestamp)
  return results
}

export function classifyWhales(whales: WhaleTx[]): WhaleStats {
  const buys = whales.filter(w => w.type === 'buy')
  const sells = whales.filter(w => w.type === 'sell')
  const transfers = whales.filter(w => w.type === 'transfer')

  const biggestBuy = buys.length > 0 ? buys.reduce((a, b) => (a.value > b.value ? a : b)) : null
  const biggestSell = sells.length > 0 ? sells.reduce((a, b) => (a.value > b.value ? a : b)) : null

  // Top whale wallet
  const walletActivity: Record<string, { buys: number; sells: number; value: number }> = {}
  for (const w of [...buys, ...sells]) {
    const addr = w.type === 'buy' ? w.to : w.from
    if (!walletActivity[addr]) walletActivity[addr] = { buys: 0, sells: 0, value: 0 }
    if (w.type === 'buy') walletActivity[addr].buys++
    else walletActivity[addr].sells++
    walletActivity[addr].value += w.value
  }
  const topWhaleEntry = Object.entries(walletActivity).sort((a, b) => b[1].value - a[1].value)[0] || null

  // New whale: first buy/sell over threshold from an address we haven't seen before
  const newWhale = (() => {
    for (const w of [...buys, ...sells].sort((a, b) => b.timestamp - a.timestamp)) {
      const raw = w.type === 'buy' ? w.to : w.from
      if (raw === '?') continue
      return {
        address: raw,
        value: w.value,
        token: w.tokenSymbol,
        timestamp: w.timestamp,
      }
    }
    return null
  })()

  return {
    biggestBuy,
    biggestSell,
    newWhale,
    topWhale: topWhaleEntry as [string, { buys: number; sells: number; value: number }] | null,
    totalWhales: buys.length + sells.length,
  }
}
