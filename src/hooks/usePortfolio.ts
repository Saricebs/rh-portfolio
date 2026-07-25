'use client'

import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import { fetchBalances, fetchPrices, calcPortfolio, type TokenInfo } from '@/lib/chain'
import { isAddress } from 'ethers'

export function usePortfolio(account: string | null) {
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [totalPnl, setTotalPnl] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [costBasis, setCostBasis] = useState<Record<string, string>>({})
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  const refresh = useCallback(() => setFetchKey(k => k + 1), [])
  const costBasisRef = useRef(costBasis)
  useEffect(() => { costBasisRef.current = costBasis }, [costBasis])

  useEffect(() => {
    if (!account) return
    if (!isAddress(account)) { startTransition(() => setError('Invalid wallet address')); return }

    let cancelled = false
    startTransition(() => { setLoading(true); setError(null) })

    const doFetch = async () => {
      try {
        const balances = await fetchBalances(account)
        if (cancelled) return
        const symbols = [...new Set(balances.map(b => b.symbol))]
        const prices = await fetchPrices(symbols)
        if (cancelled) return

        const cb: Record<string, number> = {}
        for (const [sym, val] of Object.entries(costBasisRef.current)) {
          cb[sym] = parseFloat(val) || 0
        }

        const result = calcPortfolio(balances, prices, cb)
        if (cancelled) return

        startTransition(() => {
          setTokens(result.tokens)
          setTotalValue(result.totalValue)
          setTotalCost(result.totalCost)
          setTotalPnl(result.totalPnl)
          setLoading(false)
        })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load portfolio')
      }
    }

    doFetch()

    return () => { cancelled = true }
  }, [account, fetchKey])

  const updateCostBasis = useCallback((symbol: string, val: string) => {
    setCostBasis(prev => ({ ...prev, [symbol]: val }))
    setEditingSymbol(null)
  }, [])

  const resetPortfolio = useCallback(() => {
    setTokens([])
    setTotalValue(0)
    setTotalCost(0)
    setTotalPnl(0)
  }, [])

  return {
    tokens, setTokens,
    totalValue, totalCost, totalPnl,
    loading, error,
    costBasis, editingSymbol, setEditingSymbol, updateCostBasis,
    refresh, resetPortfolio,
  }
}
