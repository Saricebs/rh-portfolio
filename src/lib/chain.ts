import { BrowserProvider, Contract, formatUnits } from 'ethers'
import type { Eip1193Provider } from 'ethers'

const ROBINHOOD_CHAIN_ID = 4663
const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com'

export const ROBINHOOD_CHAIN = {
  chainId: `0x${ROBINHOOD_CHAIN_ID.toString(16)}`,
  chainName: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: ['https://robinhoodchain.blockscout.com'],
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
  value?: number
  costBasis?: number
  pnl?: number
  pnlPercent?: number
}

const KNOWN_TOKENS: Partial<TokenInfo>[] = [
  { symbol: 'ETH', address: null, decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'WETH', address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73', decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'USDG', address: '0x96F47aD2A9C0582736016B94b504C924E28856c5', decimals: 18, logo: 'https://cryptologos.cc/logos/paxos-gold.png' },
]

export async function requestAccount(): Promise<string> {
  if (!window.ethereum) throw new Error('Install MetaMask or Robinhood Wallet')
  const provider = new BrowserProvider(window.ethereum as Eip1193Provider)
  const accounts = await provider.send('eth_requestAccounts', [])
  return accounts[0]
}

export async function switchToRobinhoodChain(ethereum: any) {
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ROBINHOOD_CHAIN.chainId }],
    })
  } catch (e: any) {
    if (e.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [ROBINHOOD_CHAIN],
      })
    }
  }
}

export async function fetchBalances(address: string): Promise<TokenInfo[]> {
  const provider = new BrowserProvider(window.ethereum as Eip1193Provider)
  const results: TokenInfo[] = []

  // Native ETH
  const ethBal = await provider.getBalance(address)
  if (ethBal > 0n) {
    results.push({
      symbol: 'ETH', address: null, decimals: 18,
      logo: KNOWN_TOKENS[0].logo!,
      balance: formatUnits(ethBal, 18),
      balanceRaw: ethBal,
    })
  }

  // ERC20s
  for (const tok of KNOWN_TOKENS.slice(1)) {
    if (!tok.address) continue
    const contract = new Contract(tok.address, ERC20_ABI, provider)
    try {
      const bal = await contract.balanceOf(address)
      if (bal > 0n) {
        results.push({
          symbol: tok.symbol!,
          address: tok.address,
          decimals: tok.decimals!,
          logo: tok.logo!,
          balance: formatUnits(bal, tok.decimals),
          balanceRaw: bal,
        })
      }
    } catch { /* skip */ }
  }

  return results
}

export async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols.map(s => {
    const map: Record<string, string> = { ETH: 'ethereum', WETH: 'ethereum', USDG: 'paxos-gold' }
    return map[s] || s.toLowerCase()
  }).join(',')
  
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)
    const data = await res.json()
    const result: Record<string, number> = {}
    const reverseMap: Record<string, string> = { ethereum: 'ETH', 'paxos-gold': 'USDG' }
    for (const [id, val] of Object.entries(data)) {
      const sym = reverseMap[id] || id.toUpperCase()
      result[sym] = (val as any).usd
    }
    return result
  } catch {
    return {}
  }
}

export function calcPortfolio(balances: TokenInfo[], prices: Record<string, number>, costBasis: Record<string, number>) {
  let totalValue = 0
  let totalCost = 0

  const enriched = balances.map(t => {
    const price = prices[t.symbol] || 0
    const value = parseFloat(t.balance) * price
    const cost = costBasis[t.symbol] || 0
    const costTotal = parseFloat(t.balance) * cost
    totalValue += value
    totalCost += costTotal
    return {
      ...t,
      price,
      value,
      costBasis: cost,
      pnl: value - costTotal,
      pnlPercent: costTotal > 0 ? ((value - costTotal) / costTotal) * 100 : undefined,
    }
  })

  return { tokens: enriched, totalValue, totalCost, totalPnl: totalValue - totalCost }
}
