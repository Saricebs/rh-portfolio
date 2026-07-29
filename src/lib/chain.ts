import { BrowserProvider, Contract, formatUnits, JsonRpcProvider, isAddress } from 'ethers'
import type { Eip1193Provider } from 'ethers'
import { KNOWN_TOKENS, RPC_URLS, CHAIN_ID, CHAIN_NAME, BLOCKSCOUT_BASE, FETCH_TIMEOUT, COINGECKO_IDS } from '@/config'
import { fetchWithTimeout } from './fetch'

declare global {
  interface Window { ethereum?: Eip1193Provider }
}

// Multi-RPC fallback with health check.
// The healthy provider is memoised so a page that makes several on-chain calls
// does not pay a getBlockNumber() probe (plus a fresh connection) every time.
let healthyRpcIndex = 0
let cachedProvider: JsonRpcProvider | null = null
let cachedProviderAt = 0
const PROVIDER_TTL = 60_000

export async function getPublicProvider(): Promise<JsonRpcProvider> {
  if (cachedProvider && Date.now() - cachedProviderAt < PROVIDER_TTL) {
    return cachedProvider
  }

  for (let attempt = 0; attempt < RPC_URLS.length; attempt++) {
    const idx = (healthyRpcIndex + attempt) % RPC_URLS.length
    const url = RPC_URLS[idx]
    try {
      const provider = new JsonRpcProvider(url, CHAIN_ID)
      await provider.getBlockNumber()
      healthyRpcIndex = idx
      cachedProvider = provider
      cachedProviderAt = Date.now()
      return provider
    } catch {
      continue
    }
  }
  cachedProvider = null
  throw new Error('No RPC endpoint available for Robinhood Chain')
}

export const ROBINHOOD_CHAIN = {
  chainId: `0x${CHAIN_ID.toString(16)}`,
  chainName: CHAIN_NAME,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: [RPC_URLS[0]],
  blockExplorerUrls: [BLOCKSCOUT_BASE],
}

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

export interface TokenInfo {
  symbol: string
  address: string | null
  decimals: number
  logo: string
  balance: string
  balanceRaw: bigint
  price?: number
  priceChange24h?: number
  marketCap?: number
  value?: number
  costBasis?: number
  pnl?: number
  pnlPercent?: number
}

async function getWalletProvider(): Promise<BrowserProvider> {
  if (!window.ethereum) throw new Error('Install MetaMask or Robinhood Wallet')
  const provider = new BrowserProvider(window.ethereum)
  await provider.getBlockNumber()
  return provider
}

export interface PriceData {
  usd: number
  usd_24h_change?: number
  usd_market_cap?: number
}

export type PriceMap = Record<string, PriceData>

// ── CoinGecko prices via /api proxy ──
export async function fetchPrices(symbols: string[]): Promise<PriceMap> {
  // Map forwards (symbol -> coingecko id) and fan the response back out over
  // every symbol that asked for it. A reverse id -> symbol lookup is lossy:
  // ETH and WETH share the `ethereum` id, so the reverse map can only name one
  // of them and the other silently ends up priced at $0.
  const idBySymbol = new Map<string, string>()
  for (const s of new Set(symbols)) {
    const id = COINGECKO_IDS[s]
    if (id) idBySymbol.set(s, id)
  }
  if (idBySymbol.size === 0) return {}

  const ids = [...new Set(idBySymbol.values())].sort().join(',')

  try {
    const res = await fetchWithTimeout(
      `/api/coingecko/prices?ids=${encodeURIComponent(ids)}`,
      undefined,
      FETCH_TIMEOUT,
    )
    if (!res.ok) return {}
    const data = await res.json() as Record<string, PriceData | undefined>

    const result: PriceMap = {}
    for (const [symbol, id] of idBySymbol) {
      const entry = data?.[id]
      if (!entry || typeof entry.usd !== 'number') continue
      result[symbol] = {
        usd: entry.usd,
        usd_24h_change: entry.usd_24h_change,
        usd_market_cap: entry.usd_market_cap,
      }
    }
    return result
  } catch {
    return {}
  }
}

// ── Wallet ──
export async function requestAccount(): Promise<string> {
  const provider = await getWalletProvider()
  const accounts: unknown = await provider.send('eth_requestAccounts', [])
  const first = Array.isArray(accounts) ? accounts[0] : undefined
  if (typeof first !== 'string' || !isAddress(first)) {
    throw new Error('No account returned by wallet')
  }
  return first
}

export function switchToRobinhoodChain(
  ethereum?: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> },
) {
  if (!ethereum?.request) return Promise.resolve(undefined)
  return ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: ROBINHOOD_CHAIN.chainId }],
  }).catch((e: { code: number }) => {
    if (e.code === 4902) {
      return ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [ROBINHOOD_CHAIN],
      })
    }
    throw e
  })
}

// ── Balances ──
interface BlockscoutToken {
  balance: string
  contractAddress: string
  decimals: string
  name: string
  symbol: string
  type: string
}

export async function fetchBalances(address: string): Promise<TokenInfo[]> {
  if (!isAddress(address)) throw new Error('Invalid wallet address')

  const provider = await getPublicProvider()
  const results: TokenInfo[] = []

  // 1. Native ETH balance
  const ethBal = await provider.getBalance(address)
  if (ethBal > 0n) {
    results.push({
      symbol: 'ETH', address: null, decimals: 18,
      logo: KNOWN_TOKENS[0].logo,
      balance: formatUnits(ethBal, 18),
      balanceRaw: ethBal,
    })
  }

  // 2. Blockscout tokenlist — discovers ALL ERC-20 tokens in one call
  const knownByAddress = new Map(
    KNOWN_TOKENS.filter(t => t.address).map(t => [t.address!.toLowerCase(), t]),
  )
  const seen = new Set<string>()

  try {
    const res = await fetchWithTimeout(
      `/api/blockscout?module=account&action=tokenlist&address=${address}`,
      undefined,
      FETCH_TIMEOUT,
    )
    if (res.ok) {
      const data = await res.json()
      if (data.message === 'OK' && Array.isArray(data.result)) {
        for (const tok of data.result as BlockscoutToken[]) {
          if (tok.type !== 'ERC-20') continue
          const addr = tok.contractAddress.toLowerCase()
          if (seen.has(addr)) continue
          seen.add(addr)

          const decimals = parseInt(tok.decimals, 10) || 18
          const bal = BigInt(tok.balance)
          if (bal <= 0n) continue

          const known = knownByAddress.get(addr)
          results.push({
            symbol: tok.symbol,
            address: tok.contractAddress,
            decimals,
            logo: known?.logo || '',
            balance: formatUnits(bal, decimals),
            balanceRaw: bal,
          })
        }
      }
    }
  } catch {
    // Blockscout unavailable — fall through to direct-RPC check for known tokens
  }

  // 3. Fallback: check known tokens that Blockscout might have missed or when
  //    the Blockscout call failed entirely.
  for (const tok of KNOWN_TOKENS.slice(1)) {
    if (!tok.address) continue
    const addr = tok.address.toLowerCase()
    if (seen.has(addr)) continue
    seen.add(addr)

    const contract = new Contract(tok.address, ERC20_ABI, provider)
    try {
      const bal = await contract.balanceOf(address)
      if (bal > 0n) {
        results.push({
          symbol: tok.symbol,
          address: tok.address,
          decimals: tok.decimals,
          logo: tok.logo,
          balance: formatUnits(bal, tok.decimals),
          balanceRaw: bal,
        })
      }
    } catch { /* skip */ }
  }

  return results
}

// ── Portfolio calc ──
export function calcPortfolio(balances: TokenInfo[], prices: PriceMap, costBasis: Record<string, number>) {
  let totalValue = 0
  let totalCost = 0
  // Only positions that actually have a cost basis contribute to PnL. Treating
  // an unset basis as $0 would report the entire holding as pure profit.
  let pricedCostValue = 0
  let hasAnyCostBasis = false

  // Merge same-symbol tokens (e.g. multiple USDG contracts) before enriching.
  // Address-level dedup already happened in fetchBalances, but Blockscout can
  // return several contracts that all call themselves "USDG". Keeping them
  // separate breaks the pie chart, allocation, and analytics.
  const merged = mergeBySymbol(balances)

  const enriched = merged.map(t => {
    const p = prices[t.symbol]
    const price = p?.usd || 0
    const amount = parseFloat(t.balance) || 0
    const value = amount * price
    const cost = costBasis[t.symbol]
    const hasCost = typeof cost === 'number' && Number.isFinite(cost) && cost > 0
    const costTotal = hasCost ? amount * cost : 0

    totalValue += value
    if (hasCost) {
      totalCost += costTotal
      pricedCostValue += value
      hasAnyCostBasis = true
    }

    return {
      ...t,
      price,
      priceChange24h: p?.usd_24h_change,
      marketCap: p?.usd_market_cap,
      value,
      costBasis: hasCost ? cost : undefined,
      pnl: hasCost ? value - costTotal : undefined,
      pnlPercent: hasCost && costTotal > 0 ? ((value - costTotal) / costTotal) * 100 : undefined,
    }
  })

  return {
    tokens: enriched,
    totalValue,
    totalCost,
    totalPnl: hasAnyCostBasis ? pricedCostValue - totalCost : undefined,
    hasCostBasis: hasAnyCostBasis,
  }
}

/** Merge TokenInfo entries that share the same symbol by summing their balance.
 *  The first entry's address/logo/decimals win; the raw balance is kept for
 *  the first entry only. */
function mergeBySymbol(items: TokenInfo[]): TokenInfo[] {
  const map = new Map<string, TokenInfo>()
  for (const t of items) {
    const existing = map.get(t.symbol)
    if (existing) {
      // Sum decimals-normalized balances
      const eBal = parseFloat(existing.balance) || 0
      const tBal = parseFloat(t.balance) || 0
      existing.balance = String(eBal + tBal)
      existing.balanceRaw = existing.balanceRaw + t.balanceRaw
    } else {
      map.set(t.symbol, { ...t })
    }
  }
  return [...map.values()]
}
