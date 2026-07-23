'use client'

import { useState, useCallback, useEffect } from 'react'
import { BrowserProvider } from 'ethers'
import { requestAccount, switchToRobinhoodChain } from '@/lib/chain'

export function useAccount() {
  const [account, setAccount] = useState<string | null>(null)

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem('rh_account')
    if (saved) {
      setAccount(saved)
    }
  }, [])

  // Persist account changes
  useEffect(() => {
    if (account) {
      localStorage.setItem('rh_account', account)
    } else {
      localStorage.removeItem('rh_account')
    }
  }, [account])

  const connect = useCallback(async () => {
    const addr = await requestAccount()
    await switchToRobinhoodChain(window.ethereum)
    setAccount(addr)
    return addr
  }, [])

  const disconnect = useCallback(() => {
    setAccount(null)
  }, [])

  return { account, setAccount, connect, disconnect }
}
