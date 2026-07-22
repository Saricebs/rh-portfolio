'use client'

import { useReadContract, useBalance } from 'wagmi'
import { robinhoodChain, KNOWN_TOKENS } from '@/config'
import { erc20Abi } from 'viem'
import { useEffect, useState } from 'react'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export interface TokenBalance {
  symbol: string
  address: string | null
  decimals: number
  balance: bigint
  logo: string
}

export function useBalances(address: `0x${string}` | undefined) {
  const tokens = KNOWN_TOKENS.filter(t => t.address !== null)
  
  // Native ETH balance
  const { data: ethBalance } = useBalance({
    address,
    chainId: robinhoodChain.id,
  })

  // ERC20 balances
  const erc20Results = tokens.map(token =>
    useReadContract({
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address ?? ZERO_ADDRESS],
      chainId: robinhoodChain.id,
      query: { enabled: !!address },
    })
  )

  // ERC20 metadata (name, symbol, decimals) — skip if we have them in config
  const loading = !address ? false : erc20Results.some(r => r.isLoading)
  const error = erc20Results.find(r => r.isError)?.error

  const balances: TokenBalance[] = []

  if (ethBalance?.value) {
    balances.push({
      symbol: 'ETH',
      address: null,
      decimals: 18,
      balance: ethBalance.value,
      logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    })
  }

  tokens.forEach((token, i) => {
    const bal = erc20Results[i].data as bigint | undefined
    if (bal && bal > 0n) {
      balances.push({ ...token, balance: bal })
    }
  })

  return { balances, loading, error }
}
