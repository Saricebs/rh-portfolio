'use client'

import { useState, useCallback } from 'react'
import { requestAccount, switchToRobinhoodChain } from '@/lib/chain'
import { isAddress } from 'ethers'

const STORAGE_KEY = 'rh_account'

function loadSavedAccount(): string | null {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved && isAddress(saved) ? saved : null
}

export function useAccount() {
  const [account, setAccount] = useState<string | null>(loadSavedAccount)

  const connect = useCallback(async () => {
    const addr = await requestAccount()
    await switchToRobinhoodChain(window.ethereum)
    setAccount(addr)
    localStorage.setItem(STORAGE_KEY, addr)
    return addr
  }, [])

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAccount(null)
  }, [])

  return { account, setAccount, connect, disconnect }
}
