'use client'

import { useState, useMemo, useEffect } from 'react'
import { fetchTransactions, filterTxs, type Tx } from '@/lib/transactions'

const BLOCKSCOUT = 'https://robinhoodchain.blockscout.com'

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

export default function TransactionHistory({ address, tokenSymbols }: Props) {
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('All')
  const [tokenFilter, setTokenFilter] = useState('All')

  useEffect(() => {
    setLoading(true)
    fetchTransactions(address)
      .then(setTxs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  const filtered = useMemo(
    () => filterTxs(txs, typeFilter, tokenFilter),
    [txs, typeFilter, tokenFilter],
  )

  const typeOptions = ['All', ...new Set(txs.map(t => t.method))]
  const tokenOptions = ['All', ...new Set(tokenSymbols)]

  function timeAgo(ts: number) {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className="mt-8">
      <div className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Activity</div>

      {/* Filters */}
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

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-4 w-32 bg-zinc-800 rounded" />
              <div className="h-3 w-48 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-600 text-sm text-center py-8 border border-dashed border-zinc-800 rounded-xl">
          No transactions found
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => (
            <a
              key={tx.hash}
              href={`${BLOCKSCOUT}/tx/${tx.hash}`}
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
                    <div className="text-sm font-medium">
                      {METHOD_LABELS[tx.method] || tx.method}
                    </div>
                    <div className="text-xs text-zinc-500">
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
