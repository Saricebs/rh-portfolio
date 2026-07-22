'use client'

import { createPublicClient, http, erc20Abi, type Address } from 'viem'
import { robinhoodChain } from '@/config'
import { useEffect, useState, useCallback } from 'react'

const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(),
})

export interface TokenBalance {
  symbol: string
  address: Address | null
  decimals: number
  balance: bigint
  balanceFormatted: string
  logo: string
}

interface TokenMeta {
  symbol: string
  address: string | null
  decimals: number
  logo: string
}

const TOKENS: TokenMeta[] = [
  { symbol: 'ETH', address: null, decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'WETH', address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73', decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'USDG', address: '0x96F47aD2A9C0582736016B94b504C924E28856c5', decimals: 18, logo: '' },
]

export const PRICE_IDS: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'ethereum',
  USDG: 'paxos-gold',
}

export function useBalances(address: Address | undefined) {
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!address) { setBalances([]); return }
    setLoading(true)
    setError(null)
    try {
      const results: TokenBalance[] = []

      // Native ETH
      const ethBal = await publicClient.getBalance({ address })
      if (ethBal > 0n) {
        results.push({
          symbol: 'ETH', address: null, decimals: 18,
          balance: ethBal,
          balanceFormatted: formatBalance(ethBal, 18),
          logo: TOKENS[0].logo,
        })
      }

      // ERC20 tokens
      for (const t of TOKENS.slice(1)) {
        if (!t.address) continue
        try {
          const bal = await publicClient.readContract({
            address: t.address as Address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          })
          if (bal > 0n) {
            results.push({
              symbol: t.symbol,
              address: t.address as Address,
              decimals: t.decimals,
              balance: bal,
              balanceFormatted: formatBalance(bal, t.decimals),
              logo: t.logo,
            })
          }
        } catch { /* token may not exist or error */ }
      }

      setBalances(results)
    } catch (e: any) {
      setError(e.message || 'Failed to fetch balances')
    }
    setLoading(false)
  }, [address])

  useEffect(() => { fetch() }, [fetch])

  return { balances, loading, error, refetch: fetch }
}

export function usePrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null)
  const id = PRICE_IDS[symbol] || symbol.toLowerCase()

  useEffect(() => {
    if (!symbol) return
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
      .then(r => r.json())
      .then(d => setPrice(d[id]?.usd ?? null))
      .catch(() => setPrice(null))
  }, [symbol, id])

  return price
}

function formatBalance(bigintVal: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals)
  const whole = bigintVal / divisor
  const frac = bigintVal % divisor
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4)
  return `${whole.toLocaleString()}.${fracStr}`
}
