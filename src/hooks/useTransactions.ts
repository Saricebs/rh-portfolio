'use client'

import { useState, useEffect } from 'react'
import { fetchTransactions, filterTxs, type Tx } from '@/lib/transactions'

export function useTransactions(address: string) {
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchTransactions(address)
      .then(setTxs)
      .catch(e => console.warn('tx fetch failed', e))
      .finally(() => setLoading(false))
  }, [address])

  return { txs, loading }
}
