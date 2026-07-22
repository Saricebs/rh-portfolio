'use client'

import { useState, useEffect, useCallback } from 'react'
import { requestAccount, switchToRobinhoodChain, fetchBalances, fetchPrices, calcPortfolio, type TokenInfo } from '@/lib/chain'
import { fetchTrending, type TrendingToken } from '@/lib/trending'

export default function Home() {
  const [account, setAccount] = useState<string | null>(null)
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalPnl, setTotalPnl] = useState(0)
  const [loading, setLoading] = useState(false)
  const [costBasis, setCostBasis] = useState<Record<string, string>>({})
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trending, setTrending] = useState<TrendingToken[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [tab, setTab] = useState<'portfolio' | 'trending'>('portfolio')

  const connect = useCallback(async () => {
    try {
      setError(null)
      const addr = await requestAccount()
      await switchToRobinhoodChain(window.ethereum)
      setAccount(addr)
    } catch (e: any) {
      setError(e.message || 'Connection failed')
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!account) return
    setLoading(true)
    setError(null)
    try {
      const balances = await fetchBalances(account)
      const symbols = [...new Set(balances.map(b => b.symbol))]
      const prices = await fetchPrices(symbols)

      const cb: Record<string, number> = {}
      for (const [sym, val] of Object.entries(costBasis)) {
        cb[sym] = parseFloat(val) || 0
      }

      const { tokens: enriched, totalValue: tv, totalPnl: tp } = calcPortfolio(balances, prices, cb)
      setTokens(enriched)
      setTotalValue(tv)
      setTotalPnl(tp)
    } catch (e: any) {
      setError(e.message || 'Failed to load portfolio')
    }
    setLoading(false)
  }, [account, costBasis])

  useEffect(() => { if (account) refresh() }, [account])

  useEffect(() => {
    setTrendingLoading(true)
    fetchTrending()
      .then(t => setTrending(t))
      .catch(() => {})
      .finally(() => setTrendingLoading(false))
  }, [])

  const updateCostBasis = (symbol: string, val: string) => {
    setCostBasis(prev => ({ ...prev, [symbol]: val }))
    setEditingSymbol(null)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-sm font-bold">RH</div>
          <h1 className="text-lg font-semibold">Portfolio</h1>
        </div>
        <div className="flex items-center gap-4">
          {account && (
            <span className="text-sm text-zinc-400">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          )}
          {!account ? (
            <button onClick={connect} className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Connect Wallet
            </button>
          ) : (
            <button onClick={refresh} disabled={loading} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm transition-colors">
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-900/40 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="max-w-3xl mx-auto px-6 pt-4">
        <div className="flex gap-4 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setTab('portfolio')}
            className={`text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors ${
              tab === 'portfolio' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setTab('trending')}
            className={`text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors ${
              tab === 'trending' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Trending
          </button>
        </div>
      </div>

      {!account && tab === 'portfolio' ? (
        <div className="flex flex-col items-center justify-center mt-32 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-2xl">RH</div>
          <h2 className="text-xl font-semibold">Robinhood Chain Portfolio</h2>
          <p className="text-zinc-500 text-sm max-w-md text-center">
            Connect your wallet to see token balances and track your portfolio PNL on Robinhood Chain.
          </p>
        </div>
      ) : tab === 'portfolio' && account ? (
        <div className="max-w-3xl mx-auto p-6">
          {/* Portfolio Summary */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Total Value</div>
              <div className="text-2xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Total PNL</div>
              <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Token List */}
          <div className="space-y-2">
            <div className="text-zinc-500 text-xs uppercase tracking-wide px-1 mb-3">Tokens</div>
            {loading && tokens.length === 0 ? (
              <div className="text-zinc-600 text-sm text-center py-8">Loading balances...</div>
            ) : tokens.length === 0 ? (
              <div className="text-zinc-600 text-sm text-center py-8 border border-dashed border-zinc-800 rounded-xl">
                No tokens found in this wallet on Robinhood Chain
              </div>
            ) : (
              tokens.map(t => (
                <div key={t.symbol} className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                        {t.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium">{t.symbol}</div>
                        <div className="text-xs text-zinc-500">{t.balance} {t.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${t.value?.toFixed(2) || '0.00'}</div>
                      {t.pnl !== undefined && (
                        <div className={`text-xs ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                          {t.pnlPercent !== undefined && ` (${t.pnlPercent >= 0 ? '+' : ''}${t.pnlPercent.toFixed(1)}%)`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cost Basis Row */}
                  <div className="mt-2 pt-2 border-t border-zinc-800/40 flex items-center gap-2 text-xs text-zinc-500">
                    <span>Cost basis:</span>
                    {editingSymbol === t.symbol ? (
                      <>
                        <input
                          type="number"
                          step="any"
                          defaultValue={costBasis[t.symbol] || ''}
                          placeholder="0.00"
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 w-24 text-white text-xs"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateCostBasis(t.symbol, (e.target as HTMLInputElement).value)
                            }
                            if (e.key === 'Escape') setEditingSymbol(null)
                          }}
                          autoFocus
                        />
                        <button onClick={() => setEditingSymbol(null)} className="text-zinc-600 hover:text-zinc-400">cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setEditingSymbol(t.symbol)} className="text-zinc-400 hover:text-white">
                        ${costBasis[t.symbol] ? parseFloat(costBasis[t.symbol]).toFixed(2) : '—'} / {t.symbol}
                      </button>
                    )}
                    {t.price ? <span className="ml-auto">${t.price.toFixed(2)}</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : tab === 'trending' ? (
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="text-zinc-500 text-xs uppercase tracking-wide">
              Trending · CoinGecko
            </div>
            <button
              onClick={() => {
                setTrendingLoading(true)
                fetchTrending().then(t => setTrending(t)).catch(() => {}).finally(() => setTrendingLoading(false))
              }}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Refresh
            </button>
          </div>

          {trendingLoading ? (
            <div className="text-zinc-600 text-sm text-center py-8">Loading trending tokens...</div>
          ) : trending.length === 0 ? (
            <div className="text-zinc-600 text-sm text-center py-8 border border-dashed border-zinc-800 rounded-xl">
              No trending data available
            </div>
          ) : (
            <div className="space-y-2">
              {trending.map((t, i) => (
                <a
                  key={t.coinGeckoId}
                  href={`https://www.coingecko.com/en/coins/${t.coinGeckoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 overflow-hidden">
                        {t.image ? (
                          <img src={t.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{t.symbol}</div>
                        <div className="text-xs text-zinc-500">{t.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${t.priceUsd < 0.001 ? t.priceUsd.toExponential(4) : t.priceUsd < 1 ? t.priceUsd.toFixed(6) : t.priceUsd.toFixed(2)}</div>
                      <div className={`text-xs ${t.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.priceChange24h >= 0 ? '+' : ''}{t.priceChange24h.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                    <span>Vol 24h: <span className="text-zinc-300">${(t.volume24h).toLocaleString()}</span></span>
                    {t.marketCap > 0 && <span>MCap: <span className="text-zinc-300">${(t.marketCap).toLocaleString()}</span></span>}
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="mt-6 text-center text-xs text-zinc-700">
            Data from CoinGecko · Robinhood Ecosystem
          </div>
        </div>
      ) : null}
    </main>
  )
}
