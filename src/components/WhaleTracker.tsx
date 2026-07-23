'use client'

import { useState, useEffect } from 'react'
import { fetchWhaleActivity, classifyWhales, type WhaleTx } from '@/lib/whales'

const BLOCKSCOUT = 'https://robinhoodchain.blockscout.com'

export default function WhaleTracker() {
  const [whales, setWhales] = useState<WhaleTx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchWhaleActivity()
      .then(setWhales)
      .catch(e => console.warn("whale fetch failed", e))
      .finally(() => setLoading(false))
  }, [])

  const stats = classifyWhales(whales)
  const recent = whales.slice(0, 5)

  function timeAgo(ts: number) {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div>
      <div className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Whale Tracker</div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-3 w-16 bg-zinc-800 rounded" />
              <div className="h-5 w-20 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Biggest Buy</div>
              {stats.biggestBuy ? (
                <>
                  <div className="text-lg font-bold text-emerald-400">
                    {stats.biggestBuy.value.toFixed(4)} {stats.biggestBuy.tokenSymbol}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {formatAddress(stats.biggestBuy.to)} · {timeAgo(stats.biggestBuy.timestamp)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-zinc-500">—</div>
              )}
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Biggest Sell</div>
              {stats.biggestSell ? (
                <>
                  <div className="text-lg font-bold text-red-400">
                    {stats.biggestSell.value.toFixed(4)} {stats.biggestSell.tokenSymbol}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {formatAddress(stats.biggestSell.from)} · {timeAgo(stats.biggestSell.timestamp)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-zinc-500">—</div>
              )}
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Whale Wallet</div>
              {stats.topWhale ? (
                <>
                  <div className="text-lg font-bold text-white text-sm font-mono">
                    {stats.topWhale[0]}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {stats.topWhale[1].buys}B/{stats.topWhale[1].sells}S · ${stats.topWhale[1].value.toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-zinc-500">—</div>
              )}
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Whale TXs (24h)</div>
              <div className="text-lg font-bold text-white">{stats.totalWhales}</div>
            </div>
          </div>

          {/* Recent whale list */}
          {recent.length > 0 && (
            <div className="space-y-2">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Recent Whale Activity</div>
              {recent.map((w, i) => (
                <a
                  key={`${w.hash}-${i}`}
                  href={`${BLOCKSCOUT}/tx/${w.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        w.type === 'buy' ? 'bg-emerald-900/40 text-emerald-400' :
                        w.type === 'sell' ? 'bg-red-900/40 text-red-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {w.type === 'buy' ? '🟢' : w.type === 'sell' ? '🔴' : '🔵'}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {w.value.toFixed(4)} {w.tokenSymbol}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {w.type === 'buy' ? `→ ${w.to}` : w.type === 'sell' ? `← ${w.from}` : `${w.from} → ${w.to}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600 text-right">
                      <div>{timeAgo(w.timestamp)}</div>
                      {w.isWhale && <div className="text-amber-400 mt-0.5">🐋</div>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatAddress(addr: string): string {
  if (!addr) return '?'
  if (addr.includes('...')) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
