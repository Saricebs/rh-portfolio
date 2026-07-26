'use client'

import { useState, useEffect, useCallback, useMemo, startTransition } from 'react'
import { fetchBalances, fetchPrices, calcPortfolio, type TokenInfo, type PriceMap } from '@/lib/chain'
import { isAddress } from 'ethers'
import { setLastUpdated, getCostBasis, setCostBasis as persistCostBasis, clearCostBasis } from '@/lib/storage'

export function usePortfolio(account: string | null) {
  // Raw inputs live in state; everything derived is computed with useMemo so a
  // cost-basis edit recalculates PnL immediately instead of waiting for the
  // next network refresh.
  const [balances, setBalances] = useState<TokenInfo[]>([])
  const [prices, setPrices] = useState<PriceMap>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [costBasis, setCostBasisState] = useState<Record<string, string>>({})
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)
  const [lastUpdated, setLastUpdatedState] = useState<string | null>(null)

  const refresh = useCallback(() => setFetchKey(k => k + 1), [])

  // Read after mount, not in the state initializer — localStorage is not
  // available during SSR and seeding from it breaks hydration.
  useEffect(() => {
    const saved = getCostBasis()
    if (Object.keys(saved).length > 0) setCostBasisState(saved)
  }, [])

  useEffect(() => {
    if (!account) {
      setBalances([])
      setPrices({})
      return
    }
    if (!isAddress(account)) {
      startTransition(() => setError('Invalid wallet address'))
      return
    }

    let cancelled = false
    startTransition(() => { setLoading(true); setError(null) })

    const doFetch = async () => {
      try {
        const nextBalances = await fetchBalances(account)
        if (cancelled) return
        const nextPrices = await fetchPrices([...new Set(nextBalances.map(b => b.symbol))])
        if (cancelled) return

        startTransition(() => {
          setBalances(nextBalances)
          setPrices(nextPrices)
          setLoading(false)
          const now = new Date().toISOString()
          setLastUpdatedState(now)
          setLastUpdated(now)
        })
      } catch (e) {
        if (!cancelled) {
          startTransition(() => {
            setError(e instanceof Error ? e.message : 'Failed to load portfolio')
            setLoading(false)
          })
        }
      }
    }

    doFetch()
    return () => { cancelled = true }
  }, [account, fetchKey])

  const portfolio = useMemo(() => {
    const numeric: Record<string, number> = {}
    for (const [sym, val] of Object.entries(costBasis)) {
      const n = parseFloat(String(val))
      if (Number.isFinite(n) && n > 0) numeric[sym] = n
    }
    return calcPortfolio(balances, prices, numeric)
  }, [balances, prices, costBasis])

  const updateCostBasis = useCallback((symbol: string, val: string) => {
    setCostBasisState(prev => {
      const next = { ...prev }
      const n = parseFloat(String(val))
      if (!val.trim() || !Number.isFinite(n) || n <= 0) delete next[symbol]
      else next[symbol] = val.trim()
      persistCostBasis(next)
      return next
    })
    setEditingSymbol(null)
  }, [])

  const resetPortfolio = useCallback(() => {
    setBalances([])
    setPrices({})
    setLastUpdatedState(null)
    setError(null)
  }, [])

  const clearAllCostBasis = useCallback(() => {
    setCostBasisState({})
    clearCostBasis()
  }, [])

  return {
    tokens: portfolio.tokens,
    totalValue: portfolio.totalValue,
    totalCost: portfolio.totalCost,
    totalPnl: portfolio.totalPnl,
    hasCostBasis: portfolio.hasCostBasis,
    loading, error,
    lastUpdated,
    costBasis, editingSymbol, setEditingSymbol, updateCostBasis, clearAllCostBasis,
    refresh, resetPortfolio,
  }
}
