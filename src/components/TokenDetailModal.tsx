'use client'

import { useEffect, useRef } from 'react'
import type { TokenInfo } from '@/lib/chain'

const BLOCKSCOUT = 'https://robinhoodchain.blockscout.com'

interface Props {
  token: TokenInfo
  onClose: () => void
}

export default function TokenDetailModal({ token, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape or overlay click
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const explorerUrl = token.address
    ? `${BLOCKSCOUT}/token/${token.address}`
    : `${BLOCKSCOUT}/search?q=${token.symbol}`

  const change = token.priceChange24h ?? 0
  const up = change >= 0

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fade-slide">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 text-lg leading-none"
        >
          ✕
        </button>

        {/* Header — logo + symbol */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-base font-bold text-zinc-400 overflow-hidden">
            {token.logo ? (
              <img src={token.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              token.symbol.slice(0, 2)
            )}
          </div>
          <div>
            <div className="text-lg font-semibold">{token.symbol}</div>
            <div className="text-sm text-zinc-500">
              {parseFloat(token.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })} {token.symbol}
            </div>
          </div>
        </div>

        {/* Stat rows */}
        <div className="space-y-3">
          <Row label="USD Value" value={`$${(token.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <Row label="Price" value={token.price ? `$${token.price.toFixed(2)}` : '—'} />
          <Row label="24H Change" value={`${up ? '+' : ''}${change.toFixed(2)}%`} valueClass={up ? 'text-emerald-400' : 'text-red-400'} />
          <Row label="PnL" value={`${(token.pnl ?? 0) >= 0 ? '+' : ''}${(token.pnl ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} valueClass={(token.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <Row label="Contract" value={token.address ? `${token.address.slice(0, 6)}...${token.address.slice(-4)}` : 'Native ETH'} />
        </div>

        {/* Explorer link */}
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 block w-full text-center bg-zinc-800 hover:bg-zinc-700 rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          View on Explorer ↗
        </a>
      </div>
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={valueClass ?? 'text-white font-medium'}>{value}</span>
    </div>
  )
}
