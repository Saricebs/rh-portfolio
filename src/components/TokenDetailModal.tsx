'use client'

import { useEffect, useRef } from 'react'
import type { TokenInfo } from '@/lib/chain'
import { formatCurrency, formatSignedCurrency, formatPercent, formatUsdValue } from '@/lib/format'
import { BLOCKSCOUT_BASE } from '@/config'
import { useClipboard } from '@/lib/clipboard'

interface Props {
  token: TokenInfo
  onClose: () => void
}

export default function TokenDetailModal({ token, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const { copy } = useClipboard()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const explorerUrl = token.address
    ? `${BLOCKSCOUT_BASE}/token/${token.address}`
    : `${BLOCKSCOUT_BASE}/search?q=${token.symbol}`

  const change = token.priceChange24h ?? 0
  const up = change >= 0

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fade-slide">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 text-lg leading-none"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-base font-bold text-zinc-400 overflow-hidden">
            {token.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={token.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              token.symbol.slice(0, 2)
            )}
          </div>
          <div>
            <div className="text-lg font-semibold">{token.symbol}</div>
            <div className="text-sm text-zinc-500">
              {formatCurrency(parseFloat(token.balance))} {token.symbol}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Row label="USD Value" value={formatCurrency(token.value)} />
          <Row label="Price" value={token.price ? `$${formatUsdValue(token.price)}` : '—'} />
          <Row label="24H Change" value={formatPercent(token.priceChange24h)} valueClass={up ? 'text-emerald-400' : 'text-red-400'} />
          <Row label="PnL" value={formatSignedCurrency(token.pnl)} valueClass={(token.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <Row label="Contract" value={token.address ? `${token.address.slice(0, 6)}...${token.address.slice(-4)}` : 'Native ETH'} />
        </div>

        <div className="mt-4 flex gap-2">
          {token.address && (
            <button
              onClick={() => copy(token.address as string, 'Address copied')}
              className="flex-1 text-center bg-zinc-800 hover:bg-zinc-700 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              Copy Address
            </button>
          )}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 block text-center bg-zinc-800 hover:bg-zinc-700 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Explorer ↗
          </a>
        </div>
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
