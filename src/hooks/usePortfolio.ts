'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchBalances, fetchPrices, calcPortfolio, type TokenInfo } from '@/lib/chain'
import { fetchPortfolioChart, type ChartData } from '@/lib/chart'

export function usePortfolio(account: string | null) {
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [totalPnl, setTotalPnl] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [costBasis, setCostBasis] = useState<Record<string, string>>({})
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [chartLoading, setChartLoading] = useState(false)

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

      const { tokens: enriched, totalValue: tv, totalCost: tc, totalPnl: tp } = calcPortfolio(balances, prices, cb)
      setTokens(enriched)
      setTotalValue(tv)
      setTotalCost(tc)
      setTotalPnl(tp)

      if (enriched.length > 0) {
        setChartLoading(true)
        fetchPortfolioChart(enriched, 7)
          .then(setChartData)
          .catch(e => console.warn('chart fetch failed', e))
          .finally(() => setChartLoading(false))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio')
    }
    setLoading(false)
  }, [account, costBasis])

  useEffect(() => { if (account) refresh() }, [account])

  const updateCostBasis = useCallback((symbol: string, val: string) => {
    setCostBasis(prev => ({ ...prev, [symbol]: val }))
    setEditingSymbol(null)
  }, [])

  const resetPortfolio = useCallback(() => {
    setTokens([])
    setTotalValue(0)
    setTotalCost(0)
    setTotalPnl(0)
    setChartData(null)
  }, [])

  return {
    tokens, setTokens,
    totalValue, totalCost, totalPnl,
    loading, error,
    costBasis, editingSymbol, setEditingSymbol, updateCostBasis,
    chartData, chartLoading,
    refresh, resetPortfolio,
  }
}
