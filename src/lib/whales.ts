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
  fromLabel?: string
  toLabel?: string
  timestamp: number
  isWhale: boolean
}

// WETH, USDG, USDC are common base tokens
const BASE_TOKENS = new Set(['WETH', 'USDG', 'USDC', 'USDT'])
const WHALE_THRESHOLD_USD = 1000 // $1k+

// Known addresses - we detect swaps when interacting with DEX contracts
const DEX_CONTRACTS = new Set([
  '0xcaf681a66d020601342297493863e78c959e5cb2', // SwapRouter02
  '0x8876789976decbfcbbbe364623c63652db8c0904', // UniversalRouter
].map(a => a.toLowerCase()))

interface BlockscoutTx {
  hash: string
  from: { hash: string }
  to: { hash: string }
  timestamp: string
  token: { symbol: string; address: string; decimals: string }
  total: { value: string }
  tx_hash: string
}

function isSwap(toAddr: string, data: string): boolean {
  const addr = toAddr?.toLowerCase() || ''
  if (DEX_CONTRACTS.has(addr)) return true
  // Common swap method signatures
  const sigs = ['0x38ed1739', '0x8803dbee', '0x7ff36ab5', '0x18cbafe5', '0x3593564c']
  if (data) {
    const sig = data.slice(0, 10)
    if (sigs.includes(sig)) return true
    // Uniswap exactInput/Output
    if (sig === '0xc04b8d59' || sig === '0x414bf389') return true
    // UniversalRouter execute
    if (sig === '0x3593564c') return true
  }
  return false
}

function formatAddress(addr: string): string {
  if (!addr) return '?'
  if (addr === '0x0000000000000000000000000000000000000000') return 'Burn'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export async function fetchWhaleActivity(): Promise<WhaleTx[]> {
  // Fetch recent token transfers
  const url = `${API}/v2/token-transfers?type=ERC-20&limit=50`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Blockscout ${res.status}`)
  const data = await res.json()
  const items: BlockscoutTx[] = data.items || []

  // Process into WhaleTx items
  const txs: WhaleTx[] = []

  for (const item of items) {
    const token: { symbol?: string; address?: string; decimals?: string } = item.token || {}
    const total: { value?: string } = item.total || {}
    const decimals = parseInt(token.decimals || '18')
    const rawValue = total.value || '0'
    const value = parseFloat(rawValue) / (10 ** decimals)
    const symbol = token.symbol || '?'

    // Skip very small values
    if (value === 0) continue

    const from = item.from?.hash || ''
    const to = item.to?.hash || ''
    const txHash = item.tx_hash || ''
    const ts = item.timestamp ? new Date(item.timestamp).getTime() : Date.now()

    // Try to classify: if interacting with a DEX, it's a swap
    // Direction: from user to contract = buy/sell depending on context
    // For simplicity, label based on from/to patterns
    const toIsDex = DEX_CONTRACTS.has(to.toLowerCase())
    const fromIsDex = DEX_CONTRACTS.has(from.toLowerCase())
    
    let type: WhaleTx['type'] = 'transfer'
    if (toIsDex || fromIsDex) {
      type = toIsDex ? 'sell' : 'buy'
    }

    const isWhale = value > WHALE_THRESHOLD_USD || 
      (symbol === 'WETH' && value > 0.5) || // >$1k worth
      (symbol === 'USDG' && value > 1000)

    const whale: WhaleTx = {
      hash: txHash,
      type,
      tokenSymbol: symbol,
      tokenAddress: token.address || '',
      value,
      from: formatAddress(from),
      to: formatAddress(to),
      fromLabel: from === '0x0000000000000000000000000000000000000000' ? 'Burn' : undefined,
      toLabel: toIsDex ? 'DEX' : fromIsDex ? 'DEX' : undefined,
      timestamp: ts,
      isWhale,
    }

    txs.push(whale)
  }

  // Sort by timestamp descending
  txs.sort((a, b) => b.timestamp - a.timestamp)

  return txs
}

export function classifyWhales(whales: WhaleTx[]) {
  const buys = whales.filter(w => w.type === 'buy' && w.isWhale)
  const sells = whales.filter(w => w.type === 'sell' && w.isWhale)
  const transfers = whales.filter(w => w.type === 'transfer' && w.isWhale)

  // Biggest buy by value
  const biggestBuy = buys.length > 0
    ? buys.reduce((a, b) => (a.value > b.value ? a : b))
    : null

  // Biggest sell
  const biggestSell = sells.length > 0
    ? sells.reduce((a, b) => (a.value > b.value ? a : b))
    : null

  // Most active whale wallet
  const walletCounts: Record<string, { buys: number; sells: number; value: number }> = {}
  for (const w of [...buys, ...sells]) {
    const addr = w.type === 'buy' ? w.from : w.to
    if (!walletCounts[addr]) walletCounts[addr] = { buys: 0, sells: 0, value: 0 }
    if (w.type === 'buy') walletCounts[addr].buys++
    else walletCounts[addr].sells++
    walletCounts[addr].value += w.value
  }

  const topWhale = Object.entries(walletCounts)
    .sort((a, b) => b[1].value - a[1].value)[0]

  return { biggestBuy, biggestSell, topWhale, totalWhales: buys.length + sells.length }
}
