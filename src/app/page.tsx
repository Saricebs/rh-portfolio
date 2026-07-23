'use client'

import { useState } from 'react'
import { type TokenInfo } from '@/lib/chain'
import { useAccount } from '@/hooks/useAccount'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useTrending } from '@/hooks/useTrending'

import PortfolioChartComponent from '@/components/PortfolioChart'
import AllocationPieChartComponent from '@/components/AllocationPieChart'
import TokenDetailModalComponent from '@/components/TokenDetailModal'
import TransactionHistoryComponent from '@/components/TransactionHistory'
import LpDashboardComponent from '@/components/LpDashboard'
import WalletAnalyticsComponent from '@/components/WalletAnalytics'

export default function Home() {
  const { account, connect, disconnect } = useAccount()
  const {
    tokens, totalValue, totalCost, totalPnl,
    loading, error,
    costBasis, editingSymbol, setEditingSymbol, updateCostBasis,
    chartData, chartLoading,
    refresh, resetPortfolio,
  } = usePortfolio(account)
  const { trending, loading: trendingLoading, refresh: refreshTrending } = useTrending()

  const [tab, setTab] = useState<'portfolio' | 'trending'>('portfolio')
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)

  const handleDisconnect = () => {
    resetPortfolio()
    disconnect()
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-3 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <img src="/rh-logo.png" alt="RH" className="w-8 h-8 rounded-lg" />
          <h1 className="text-lg font-semibold">Portfolio</h1>
        </div>
        <div className="flex items-center gap-4">
          {account && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">{account.slice(0, 6)}...{account.slice(-4)}</span>
              <button onClick={handleDisconnect} className="text-xs text-zinc-600 hover:text-red-400 transition-colors" title="Disconnect">✕</button>
            </div>
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
        <div className="mx-6 mt-4 p-4 bg-red-900/40 border border-red-800 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-red-400 mt-0.5">⚠</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-red-300 font-medium">Failed to load portfolio</div>
              <div className="text-xs text-red-400/80 mt-0.5 truncate">{error}</div>
            </div>
            <button onClick={refresh} className="shrink-0 bg-red-800/60 hover:bg-red-700/60 px-3 py-1 rounded text-xs text-red-200 transition-colors">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-4">
        <div className="flex gap-4 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setTab('portfolio')}
            className={`text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors ${
              tab === 'portfolio' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >Portfolio</button>
          <button
            onClick={() => setTab('trending')}
            className={`text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors ${
              tab === 'trending' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >Trending</button>
        </div>
      </div>

      {!account && tab === 'portfolio' ? (
        <div className="flex flex-col items-center justify-center mt-32 gap-4">
          <img src="/rh-logo.png" alt="RH" className="w-16 h-16 rounded-2xl" />
          <h2 className="text-xl font-semibold">Robinhood Chain Portfolio</h2>
          <p className="text-zinc-500 text-sm max-w-md text-center">
            Connect your wallet to see token balances and track your portfolio PNL on Robinhood Chain.
          </p>
        </div>
      ) : tab === 'portfolio' && account ? (
        loading && tokens.length === 0 ? (
          <div className="max-w-3xl mx-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="mb-8">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-48 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse mb-3" />
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse ml-auto" />
                      <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse ml-auto" />
                    </div>
                  </div>
                  <div className="h-3 w-40 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="max-w-3xl mx-auto p-3 sm:p-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 mb-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900/70 transition-colors">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Total Value</div>
              <div className="text-xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              {totalPnl !== 0 && (
                <div className={`text-xs mt-1 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PnL
                </div>
              )}
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">24H Change</div>
              {tokens.length > 0 && tokens.some(t => t.priceChange24h !== undefined) ? (
                <div className="text-xl font-bold">{totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}</div>
              ) : (
                <div className="text-xl font-bold text-zinc-500">$0.00</div>
              )}
              <div className="text-xs text-zinc-500">—</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Total Assets</div>
              <div className="text-xl font-bold">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Number of Tokens</div>
              <div className="text-xl font-bold">{tokens.length}</div>
            </div>
          </div>

          <div className="mb-6">
            {chartLoading ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-44 bg-zinc-800 rounded animate-pulse" />
              </div>
            ) : chartData && chartData.values.length > 1 ? (
              <PortfolioChartComponent timestamps={chartData.timestamps} values={chartData.values} />
            ) : null}
          </div>

          {!chartLoading && tokens.length > 0 && (
            <div className="mb-6"><AllocationPieChartComponent tokens={tokens} /></div>
          )}
          {!chartLoading && tokens.length > 0 && (
            <div className="mb-6"><WalletAnalyticsComponent tokens={tokens} /></div>
          )}

          <div className="space-y-2">
            <div className="text-zinc-500 text-xs uppercase tracking-wide px-1 mb-3">Tokens</div>
            {tokens.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-800 rounded-xl">
                <div className="text-2xl mb-2">📭</div>
                <div className="text-zinc-500 text-sm">No tokens found in this wallet on Robinhood Chain</div>
                <button onClick={refresh} className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
              </div>
            ) : (
              tokens.map((t, i) => (
                <div key={t.symbol} onClick={() => setSelectedToken(t)}
                     className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all duration-200 cursor-pointer animate-fade-slide"
                     style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">{t.symbol.slice(0, 2)}</div>
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
                  <div className="mt-2 pt-2 border-t border-zinc-800/40 flex items-center gap-2 text-xs text-zinc-500">
                    <span>Cost basis:</span>
                    {editingSymbol === t.symbol ? (
                      <>
                        <input type="number" step="any" defaultValue={costBasis[t.symbol] || ''} placeholder="0.00"
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 w-24 text-white text-xs"
                          onKeyDown={e => {
                            if (e.key === 'Enter') updateCostBasis(t.symbol, (e.target as HTMLInputElement).value)
                            if (e.key === 'Escape') setEditingSymbol(null)
                          }}
                          autoFocus />
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
          <TransactionHistoryComponent address={account} tokenSymbols={tokens.map(t => t.symbol)} />
          <LpDashboardComponent address={account} />
        </div>
        ))
      : tab === 'trending' ? (
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="text-zinc-500 text-xs uppercase tracking-wide">Trending · CoinGecko</div>
            <button onClick={refreshTrending} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
          </div>

          {trendingLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 space-y-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse ml-auto" />
                      <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse ml-auto" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : trending.length === 0 ? (
            <div className="text-zinc-600 text-sm text-center py-8 border border-dashed border-zinc-800 rounded-xl">No trending data available</div>
          ) : (
            <div className="space-y-2">
              {trending.map((t, i) => (
                <a key={t.coinGeckoId} href={`https://www.coingecko.com/en/coins/${t.coinGeckoId}`} target="_blank" rel="noopener noreferrer"
                   className="block bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 overflow-hidden">
                        {t.image ? <img src={t.image} alt="" className="w-full h-full object-cover" /> : i + 1}
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

          <div className="mt-6 text-center text-xs text-zinc-700">Data from CoinGecko · Robinhood Ecosystem</div>
        </div>
      ) : null}

      {selectedToken && (
        <TokenDetailModalComponent token={selectedToken} onClose={() => setSelectedToken(null)} />
      )}
    </main>
  )
}
