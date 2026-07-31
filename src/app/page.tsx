'use client'

import { useState, useMemo, type ChangeEvent } from 'react'
import { isAddress } from 'ethers'
import { type TokenInfo } from '@/lib/chain'
import { useAccount } from '@/hooks/useAccount'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useTrending } from '@/hooks/useTrending'
import { addRecentSearch } from '@/lib/storage'
import { formatCurrency, formatCompactNumber, formatPrice, formatUsdValue, formatPnl } from '@/lib/format'
import { BLOCKSCOUT_BASE } from '@/config'
import { useToast } from '@/lib/toast'
import { useClipboard } from '@/lib/clipboard'

import PortfolioChartComponent from '@/components/PortfolioChart'
import AllocationPieChartComponent from '@/components/AllocationPieChart'
import TokenDetailModalComponent from '@/components/TokenDetailModal'
import TransactionHistoryComponent from '@/components/TransactionHistory'
import LpDashboardComponent from '@/components/LpDashboard'
import WalletAnalyticsComponent from '@/components/WalletAnalytics'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import PortfolioSummary from '@/components/PortfolioSummary'
import RecentSearches from '@/components/RecentSearches'
export default function Home() {
  const { account, isConnected, disconnect, setAccount, connect } = useAccount()
  const {
    tokens, totalValue, totalCost, totalPnl, hasCostBasis,
    loading, error, lastUpdated,
    costBasis, editingSymbol, setEditingSymbol, updateCostBasis,
    refresh, resetPortfolio,
  } = usePortfolio(account)
  const { trending, loading: trendingLoading, error: trendingError, refresh: refreshTrending } = useTrending()

  const [tab, setTab] = useState<'portfolio' | 'trending'>('portfolio')
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()
  const { copy } = useClipboard()

  const handleDisconnect = () => {
    resetPortfolio()
    disconnect()
  }

  const handleConnect = () => {
    connect()
  }

  const handleRefresh = () => {
    if (loading) return
    refresh()
  }

  const handleRecentSelect = (addr: string) => {
    addRecentSearch(addr)
    if (account !== addr) {
      resetPortfolio()
      setAccount(addr)
    }
  }

  const handleShare = () => {
    // useAccount keeps ?address=… on the URL; without it this copied a link
    // that showed the recipient an empty app.
    if (!account) return
    const url = new URL(window.location.href)
    url.searchParams.set('address', account)
    copy(url.toString(), 'Portfolio link copied')
  }

  // ── Client-side token search ──
  const searchLower = searchQuery.toLowerCase().trim()
  const filteredTokens = useMemo(() => {
    if (!searchLower) return tokens
    return tokens.filter(t => {
      const addr = (t.address ?? '').toLowerCase()
      return t.symbol.toLowerCase().includes(searchLower) ||
        addr.includes(searchLower)
    })
  }, [tokens, searchLower])

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-3 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rh-logo.png" alt="RH" className="w-8 h-8 rounded-lg" />
          <h1 className="text-lg font-semibold">Portfolio</h1>
        </div>
        <div className="flex items-center gap-4">
          {account && !isConnected && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">Viewing: {account.slice(0, 6)}...{account.slice(-4)}</span>
              <button onClick={() => setAccount(null)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors" title="Clear address">✕</button>
            </div>
          )}
          {account && isConnected && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => copy(account, 'Address copied')}
                className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Copy address"
              >
                <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                  <path strokeWidth="2" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
              <a
                href={`${BLOCKSCOUT_BASE}/address/${account}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-zinc-400 text-sm"
                title="Open in Explorer"
              >
                ↗
              </a>
              <button onClick={handleDisconnect} className="text-xs text-zinc-600 hover:text-red-400 transition-colors" title="Disconnect">✕</button>
            </div>
          )}
          {!account || !isConnected ? (
            <button onClick={handleConnect} className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Connect Wallet
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5"
                title="Share portfolio"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
              </button>
              <button onClick={handleRefresh} disabled={loading} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {loading ? '' : 'Refresh'}
              </button>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="mx-3 sm:mx-6 mt-4 p-4 bg-red-900/40 border border-red-800 rounded-xl">
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
        <div className="flex flex-col items-center justify-center mt-16 sm:mt-32 gap-4 px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rh-logo.png" alt="RH" className="w-16 h-16 rounded-2xl" />
          <h2 className="text-xl font-semibold">Robinhood Chain Portfolio</h2>
          <p className="text-zinc-500 text-sm max-w-md text-center">
            Connect your wallet to see token balances and track your portfolio PNL on Robinhood Chain.
          </p>
          <button onClick={handleConnect} className="mt-2 bg-violet-600 hover:bg-violet-500 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Connect Wallet
          </button>
          <div className="w-full max-w-xs mt-4">
            <input
              type="text"
              placeholder="Or enter wallet address..."
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (isAddress(val)) handleRecentSelect(val)
                  else toast('Invalid address', 'error')
                }
              }}
            />
          </div>
          <RecentSearches onSelect={handleRecentSelect} />
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
          {/* Feature 4: Portfolio Summary Card */}
          <div className="mb-4">
            <PortfolioSummary address={account} tokens={tokens} totalValue={totalValue} lastUpdated={lastUpdated} />
          </div>

          <ErrorBoundary name="Portfolio">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 mb-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900/70 transition-colors">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Total Value</div>
              <div className="text-xl font-bold">{formatCurrency(totalValue)}</div>
              {hasCostBasis && totalPnl !== undefined ? (
                <div className={`text-xs mt-1 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)} PnL
                </div>
              ) : (
                <div className="text-xs mt-1 text-zinc-600">Set a cost basis for PnL</div>
              )}
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">24H Change</div>
              {(() => {
                const weighted = tokens.reduce((acc, t) => {
                  if (t.priceChange24h !== undefined && t.price !== undefined && t.value !== undefined) {
                    return acc + (t.priceChange24h * t.value)
                  }
                  return acc
                }, 0)
                const totalVal = tokens.reduce((acc, t) => acc + (t.value || 0), 0)
                const pct = totalVal > 0 ? weighted / totalVal : 0
                return pct !== 0 ? (
                  <>
                    <div className={`text-xl font-bold ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </div>
                    <div className="text-xs mt-1 text-zinc-500">weighted by value</div>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold text-zinc-500">{tokens.some(t => t.priceChange24h !== undefined) ? '0.00%' : '—'}</div>
                    <div className="text-xs mt-1 text-zinc-500">{tokens.some(t => t.priceChange24h !== undefined) ? 'no change' : 'no price data'}</div>
                  </>
                )
              })()}
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Cost Basis</div>
              <div className="text-xl font-bold">{hasCostBasis ? formatCurrency(totalCost) : '—'}</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Number of Tokens</div>
              <div className="text-xl font-bold">{tokens.length}</div>
            </div>
          </div>
          </ErrorBoundary>

          {/* Portfolio Chart */}
          <div className="mb-6">
            {tokens.length > 0 ? (
              <ErrorBoundary name="Chart">
                <PortfolioChartComponent tokens={tokens} />
              </ErrorBoundary>
            ) : null}
          </div>

          {/* Asset Allocation */}
          {tokens.length > 0 && (
            <div className="mb-6">
              <ErrorBoundary name="Allocation">
                <AllocationPieChartComponent tokens={tokens} />
              </ErrorBoundary>
            </div>
          )}
          {tokens.length > 0 && (
            <div className="mb-6">
              <ErrorBoundary name="Analytics">
                <WalletAnalyticsComponent tokens={tokens} />
              </ErrorBoundary>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="text-zinc-500 text-xs uppercase tracking-wide">Tokens</div>
              {/* Feature 8: Token Search */}
              {tokens.length > 1 && (
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="6" strokeWidth="2" />
                    <path strokeWidth="2" d="M16.5 16.5L21 21" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-8 pr-3 py-1.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 w-40"
                  />
                </div>
              )}
            </div>
            {filteredTokens.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-800 rounded-xl">
                <div className="text-2xl mb-2">📭</div>
                <div className="text-zinc-500 text-sm">
                  {searchQuery ? 'No matching tokens' : 'No tokens found in this wallet on Robinhood Chain'}
                </div>
                <button onClick={refresh} className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
              </div>
            ) : (
              filteredTokens.map((t, i) => (
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
                      <div className="font-medium">${formatUsdValue(t.value)}</div>
                      {t.pnl !== undefined && (
                        <div className={`text-xs ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPnl(t.pnl, t.pnlPercent)}
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
                      <button onClick={(e) => { e.stopPropagation(); setEditingSymbol(t.symbol) }} className="text-zinc-400 hover:text-white">
                        ${costBasis[t.symbol] ? parseFloat(costBasis[t.symbol]).toFixed(2) : '—'} / {t.symbol}
                      </button>
                    )}
                    {t.price ? <span className="ml-auto">${formatUsdValue(t.price)}</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
          <ErrorBoundary name="Transactions">
            <TransactionHistoryComponent address={account} tokenSymbols={tokens.map(t => t.symbol)} />
          </ErrorBoundary>
          <ErrorBoundary name="LP">
            <LpDashboardComponent address={account} />
          </ErrorBoundary>
        </div>
        )
      ) : tab === 'trending' ? (
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="text-zinc-500 text-xs uppercase tracking-wide">Trending · Robinhood Chain</div>
            <button onClick={refreshTrending} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
          </div>
          <ErrorBoundary name="Trending">
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
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-800 rounded-xl">
              <div className="text-2xl mb-2">{trendingError ? '⚠️' : '📭'}</div>
              <div className="text-zinc-500 text-sm">{trendingError || 'No trending data available'}</div>
              {trendingError && (
                <button onClick={refreshTrending} className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Retry</button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {trending.map((t, i) => (
                <a key={t.tokenAddress} href={t.url} target="_blank" rel="noopener noreferrer"
                   className="block bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 overflow-hidden">
                        {t.image
                          ? /* eslint-disable-next-line @next/next/no-img-element -- dynamic remote image */
                            <img src={t.image} alt="" className="w-full h-full object-cover" />
                          : i + 1}
                      </div>
                      <div>
                        <div className="font-medium">{t.symbol}</div>
                        <div className="text-xs text-zinc-500">{t.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatPrice(t.priceUsd)}</div>
                      <div className={`text-xs ${t.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.priceChange24h >= 0 ? '+' : ''}{t.priceChange24h.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span>Score: <span className="text-zinc-300 font-medium">{t.score}</span></span>
                    <span>Vol: <span className="text-zinc-300">{formatCompactNumber(t.volume24h)}</span></span>
                    {t.liquidity > 0 && <span>Liq: <span className="text-zinc-300">{formatCompactNumber(t.liquidity)}</span></span>}
                    {t.marketCap > 0 && <span>MCap: <span className="text-zinc-300">{formatCompactNumber(t.marketCap)}</span></span>}
                    {t.txns24h && (
                      <span>Activity: <span className={t.txns24h.buys >= t.txns24h.sells ? 'text-emerald-400' : 'text-red-400'}>
                        {formatCompactNumber(t.txns24h.buys)} B / {formatCompactNumber(t.txns24h.sells)} S
                      </span></span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
          </ErrorBoundary>

        </div>
      ) : null}

      {selectedToken && (
        <TokenDetailModalComponent token={selectedToken} onClose={() => setSelectedToken(null)} />
      )}



      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-12 py-6 text-xs text-zinc-600 text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5">
          <a
            href="https://github.com/Saricebs/rh-portfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Saricebs/rh-portfolio
          </a>
        </div>
        <div className="text-zinc-700">Data from DEX Screener · Robinhood Chain</div>
      </footer>
    </main>
  )
}
