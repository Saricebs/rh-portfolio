'use client'

import { useState, useEffect } from 'react'
import { fetchTrendingTokens, type TokenTrend, type TrendingStats } from '@/lib/token-trends'

type Section = 'mostBought' | 'mostSold' | 'highestVolume' | 'newestTokens'

const LABELS: Record<Section, string> = {
  mostBought: 'Most Bought',
  mostSold: 'Most Sold',
  highestVolume: 'Highest Volume',
  newestTokens: 'New Tokens',
}

interface Props {}

export default function MarketTrends() {
  const [stats, setStats] = useState<TrendingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<Section>('mostBought')

  useEffect(() => {
    setLoading(true)
    fetchTrendingTokens()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const items = stats ? stats[section] : []

  return (
    <div className="mt-8">
      <div className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Market Trends</div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {(Object.keys(LABELS) as Section[]).map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              section === s ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {LABELS[s]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 animate-pulse space-y-2">
              <div className="h-4 w-24 bg-zinc-800 rounded" />
              <div className="h-3 w-32 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-zinc-600 text-sm text-center py-8 border border-dashed border-zinc-800 rounded-xl">
          No data available
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((t, i) => (
            <a
              key={t.address}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.symbol}</div>
                    <div className="text-xs text-zinc-500">{t.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    ${t.priceUsd < 0.001 ? t.priceUsd.toExponential(4) : t.priceUsd.toFixed(6)}
                  </div>
                  {section === 'mostBought' || section === 'mostSold' ? (
                    <div className="text-xs text-zinc-500">
                      B:{t.txnsBuys24h} S:{t.txnsSells24h}
                    </div>
                  ) : section === 'highestVolume' ? (
                    <div className="text-xs text-zinc-500">
                      ${t.volume24h.toLocaleString()} · Liq ${t.liquidity.toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500">
                      Vol ${t.volume24h.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex gap-3 text-xs text-zinc-600">
                {t.priceChange24h !== 0 && (
                  <span className={t.priceChange24h >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                    {t.priceChange24h >= 0 ? '+' : ''}{t.priceChange24h.toFixed(1)}%
                  </span>
                )}
                {section === 'newestTokens' && (
                  <span>{new Date(t.pairCreatedAt).toLocaleDateString()}</span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="mt-4 text-center text-xs text-zinc-700">
        Data from DexScreener · Uniswap V3 on Robinhood Chain
      </div>
    </div>
  )
}
