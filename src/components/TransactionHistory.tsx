'use client'

import { useMemo, useState } from 'react'
import { useTxsQuery } from '@/lib/blockscout'
import { filterTxs } from '@/lib/transactions'
import { BLOCKSCOUT_BASE } from '@/config'

const METHOD_LABELS: Record<string, string> = {
  Swap: '🔄 Swap',
  Transfer: '💸 Transfer',
  LP: '💧 LP',
  Bridge: '🌉 Bridge',
  Send: '📤 Send',
  Receive: '📥 Receive',
  Contract: '⚙️ Contract',
}

interface Props {
  address: string
  tokenSymbols: string[]
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatTxValue(value: string, decimals: string): string {
  const d = parseInt(decimals) || 18
  const v = BigInt(value)
  if (v === 0n) return '0'
  // Use ethers-like formatting: divide by 10^decimals
  const divisor = 10n ** BigInt(d)
  const whole = v / divisor
  const fraction = v % divisor
  if (whole > 0n) {
    const fracStr = fraction.toString().padStart(Number(d), '0').replace(/0+$/, '')
    return fracStr ? `${whole.toString()}.${fracStr.slice(0, 4)}` : whole.toString()
  }
  // Sub-1 unit: show first 4 significant digits
  const fracStr = fraction.toString().padStart(Number(d), '0')
  const trimmed = fracStr.replace(/^0+/, '')
  if (!trimmed) return '0'
  const leadingZeros = fracStr.length - trimmed.length
  return `0.${'0'.repeat(leadingZeros)}${trimmed.slice(0, 4)}`
}

export default function TransactionHistory({ address, tokenSymbols }: Props) {
  const [typeFilter, setTypeFilter] = useState('All')
  const [tokenFilter, setTokenFilter] = useState('All')

  const { data, isLoading, error, refetch, isFetching } = useTxsQuery(address)
  const txs = useMemo(() => data?.data ?? [], [data])
  const warning = data?.warning ?? null

  const filtered = useMemo(
    () => filterTxs(txs, typeFilter, tokenFilter),
    [txs, typeFilter, tokenFilter],
  )

  const typeOptions = useMemo(() => ['All', ...new Set(txs.map(t => t.method))], [txs])
  const tokenOptions = useMemo(() => ['All', ...new Set(tokenSymbols)], [tokenSymbols])

  const isLoadingSkeleton = isLoading && txs.length === 0

  return (
    <div className="mt-8">
      <div className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Activity</div>

      {warning && (
        <div className="mb-3 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-xs text-amber-300 flex items-center justify-between gap-2">
          <span>{warning}</span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 px-2 py-1 bg-amber-800/50 hover:bg-amber-700/50 rounded-md text-amber-200 disabled:opacity-50 transition-colors"
          >
            {isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {!isLoadingSkeleton && txs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300"
          >
            {typeOptions.map(o => <option key={o} value={o}>{o === 'All' ? 'All Types' : METHOD_LABELS[o] || o}</option>)}
          </select>
          <select
            value={tokenFilter}
            onChange={e => setTokenFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300"
          >
            {tokenOptions.map(o => <option key={o} value={o}>{o === 'All' ? 'All Tokens' : o}</option>)}
          </select>
        </div>
      )}

      {isLoadingSkeleton ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-4 w-32 bg-zinc-800 rounded" />
              <div className="h-3 w-48 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-800 rounded-xl">
          <div className="text-2xl mb-2">{error ? '⚠️' : '📭'}</div>
          <div className="text-zinc-500 text-sm">
            {error
              ? (error instanceof Error ? error.message : 'Failed to load transactions')
              : 'No transactions found'
            }
          </div>
          {!error && (
            <div className="text-xs text-zinc-600 mt-1">Transactions will appear once you use this wallet</div>
          )}
          {error && (
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 disabled:opacity-50 transition-colors"
            >
              {isFetching ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => (
            <a
              key={tx.id}
              href={`${BLOCKSCOUT_BASE}/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    tx.direction === 'in' ? 'bg-emerald-900/40 text-emerald-400' :
                    tx.direction === 'out' ? 'bg-red-900/40 text-red-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {tx.direction === 'in' ? '↓' : tx.direction === 'out' ? '↑' : '↔'}
                  </div>
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      {METHOD_LABELS[tx.method] || tx.method}
                      {tx.tokenSymbol && tx.tokenSymbol !== '?' && (
                        <span className="text-zinc-500">· {tx.tokenSymbol}</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {tx.value && tx.value !== '0' && (
                        <>
                          {formatTxValue(tx.value, tx.tokenDecimal)} {tx.tokenSymbol || ''}
                          {' · '}
                        </>
                      )}
                      {tx.direction === 'in' ? 'from ' : tx.direction === 'out' ? 'to ' : ''}
                      {tx.direction === 'in' ? tx.from.slice(0, 6) + '...' + tx.from.slice(-4) :
                       tx.direction === 'out' ? tx.to.slice(0, 6) + '...' + tx.to.slice(-4) :
                       ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">{timeAgo(tx.timestamp)}</div>
                  <div className={`text-xs ${tx.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.status === 'ok' ? '✓' : '✗'}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
