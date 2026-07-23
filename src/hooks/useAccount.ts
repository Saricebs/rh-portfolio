'use client'

import { useState, useCallback } from 'react'
import { requestAccount, switchToRobinhoodChain } from '@/lib/chain'

export function useAccount() {
  const [account, setAccount] = useState<string | null>(null)

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
