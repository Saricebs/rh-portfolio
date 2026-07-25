'use client'

import { useMemo } from 'react'
import type { TokenInfo } from '@/lib/chain'
import { formatCurrency } from '@/lib/format'
import { BLOCKSCOUT_BASE } from '@/config'

interface Props {
  address: string | null
  tokens: TokenInfo[]
  totalValue: number
  lastUpdated: string | null
}

export default function PortfolioSummary({ address, tokens, totalValue, lastUpdated }: Props) {
  const nativeBalance = useMemo(() => {
    const eth = tokens.find(t => t.symbol === 'ETH')
    return eth ? parseFloat(eth.balance) : 0
  }, [tokens])

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
      <div>
        <span className="text-zinc-500">Portfolio</span>
        <span className="ml-2 font-semibold">{formatCurrency(totalValue)}</span>
      </div>
      <div>
        <span className="text-zinc-500">Assets</span>
        <span className="ml-2 font-semibold">{tokens.length}</span>
      </div>
      <div>
        <span className="text-zinc-500">ETH</span>
        <span className="ml-2 font-semibold">{nativeBalance.toFixed(4)}</span>
      </div>
      <div className="text-zinc-600 text-xs ml-auto">
        {lastUpdated ? (
          <>Updated {new Date(lastUpdated).toLocaleTimeString()}</>
        ) : (
          'Never'
        )}
      </div>
      {address && (
        <a
          href={`${BLOCKSCOUT_BASE}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-400 text-xs shrink-0"
          title="Open in Explorer"
        >
          ↗
        </a>
      )}
    </div>
  )
}
