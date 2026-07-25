import { BrowserProvider, Contract, formatUnits, JsonRpcProvider, isAddress } from 'ethers'
import type { Eip1193Provider } from 'ethers'
import { KNOWN_TOKENS, RPC_URLS, CHAIN_ID, CHAIN_NAME, BLOCKSCOUT_BASE, FETCH_TIMEOUT } from '@/config'
import { fetchWithTimeout } from './fetch'

declare global {
  interface Window { ethereum?: Eip1193Provider }
}

// Multi-RPC fallback with health check
let healthyRpcIndex = 0

export async function getPublicProvider(): Promise<JsonRpcProvider> {
  for (let attempt = 0; attempt < RPC_URLS.length; attempt++) {
    const idx = (healthyRpcIndex + attempt) % RPC_URLS.length
    const url = RPC_URLS[idx]
    try {
      const provider = new JsonRpcProvider(url, CHAIN_ID)
      await provider.getBlockNumber()
      healthyRpcIndex = idx
      return provider
    } catch {
      continue
    }
  }
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

const SYMBOL_TO_ID: Record<string, string> = { ETH: 'ethereum', WETH: 'ethereum', USDG: 'global-dollar', USDC: 'usd-coin' }
const ID_TO_SYMBOL: Record<string, string> = { ethereum: 'ETH', 'global-dollar': 'USDG', 'usd-coin': 'USDC' }

// ── CoinGecko prices via /api proxy ──
export async function fetchPrices(symbols: string[]): Promise<PriceMap> {
  const ids = symbols.map(s => SYMBOL_TO_ID[s] || s.toLowerCase()).filter(Boolean)
  const cacheKey = [...new Set(ids)].sort().join(',')

  try {
    const res = await fetchWithTimeout(`/api/coingecko/prices?ids=${cacheKey}`, undefined, FETCH_TIMEOUT)
    if (!res.ok) return {}
    const data = await res.json()
    const result: PriceMap = {}
    for (const [id, val] of Object.entries(data)) {
      const sym = ID_TO_SYMBOL[id] || id.toUpperCase()
      const entry = val as { usd: number; usd_24h_change?: number; usd_market_cap?: number }
      result[sym] = { usd: entry.usd, usd_24h_change: entry.usd_24h_change, usd_market_cap: entry.usd_market_cap }
    }
    return result
  } catch {
    return {}
  }
}

// ── Wallet ──
export async function requestAccount(): Promise<string> {
  const provider = await getWalletProvider()
  const accounts = await provider.send('eth_requestAccounts', [])
  return accounts[0]
}

export function switchToRobinhoodChain(ethereum: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> }) {
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
export async function fetchBalances(address: string): Promise<TokenInfo[]> {
  if (!isAddress(address)) throw new Error('Invalid wallet address')

  const provider = await getPublicProvider()
  const results: TokenInfo[] = []

  const ethBal = await provider.getBalance(address)
  if (ethBal > 0n) {
    results.push({
      symbol: 'ETH', address: null, decimals: 18,
      logo: KNOWN_TOKENS[0].logo,
      balance: formatUnits(ethBal, 18),
      balanceRaw: ethBal,
    })
  }

  for (const tok of KNOWN_TOKENS.slice(1)) {
    if (!tok.address) continue
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

  const enriched = balances.map(t => {
    const p = prices[t.symbol]
    const price = p?.usd || 0
    const value = parseFloat(t.balance) * price
    const cost = costBasis[t.symbol] || 0
    const costTotal = parseFloat(t.balance) * cost
    totalValue += value
    totalCost += costTotal
    return {
      ...t,
      price,
      priceChange24h: p?.usd_24h_change,
      marketCap: p?.usd_market_cap,
      value,
      costBasis: cost,
      pnl: value - costTotal,
      pnlPercent: costTotal > 0 ? ((value - costTotal) / costTotal) * 100 : undefined,
    }
  })

  return { tokens: enriched, totalValue, totalCost, totalPnl: totalValue - totalCost }
}
