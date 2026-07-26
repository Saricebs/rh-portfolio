'use client'

import { useState, useCallback, useEffect } from 'react'
import { requestAccount, switchToRobinhoodChain } from '@/lib/chain'
import { isAddress } from 'ethers'

const STORAGE_KEY = 'rh_account'
const URL_PARAM = 'address'

function readUrlAddress(): string | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get(URL_PARAM)
  return raw && isAddress(raw) ? raw : null
}

function readSavedAccount(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && isAddress(saved) ? saved : null
  } catch {
    return null
  }
}

/** Keep ?address=… in sync so the Share button produces a URL that resolves. */
function syncUrl(address: string | null) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (address) url.searchParams.set(URL_PARAM, address)
  else url.searchParams.delete(URL_PARAM)
  window.history.replaceState(null, '', url.toString())
}

export function useAccount() {
  // Starts null on both server and client. Reading localStorage in the state
  // initializer diverged from the server-rendered HTML and tripped hydration.
  const [account, setAccountState] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const setAccount = useCallback((addr: string | null) => {
    setAccountState(addr)
    syncUrl(addr)
    try {
      if (addr) localStorage.setItem(STORAGE_KEY, addr)
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* private mode / quota — non-fatal */ }
  }, [])

  useEffect(() => {
    // A shared ?address=… link wins over whatever this browser last looked at.
    const initial = readUrlAddress() ?? readSavedAccount()
    if (initial) setAccount(initial)
    setHydrated(true)
  }, [setAccount])

  // Follow the wallet instead of pinning the address captured at connect time.
  useEffect(() => {
    const eth = typeof window !== 'undefined' ? window.ethereum : undefined
    const target = eth as unknown as {
      on?: (e: string, cb: (...args: never[]) => void) => void
      removeListener?: (e: string, cb: (...args: never[]) => void) => void
    } | undefined
    if (!target?.on) return

    const onAccountsChanged = (...args: never[]) => {
      const accounts = args[0] as unknown as string[] | undefined
      const next = Array.isArray(accounts) ? accounts[0] : undefined
      setAccount(typeof next === 'string' && isAddress(next) ? next : null)
    }
    const onChainChanged = () => { /* reads are chain-pinned via RPC; nothing to reset */ }

    target.on('accountsChanged', onAccountsChanged)
    target.on('chainChanged', onChainChanged)
    return () => {
      target.removeListener?.('accountsChanged', onAccountsChanged)
      target.removeListener?.('chainChanged', onChainChanged)
    }
  }, [setAccount])

  const connect = useCallback(async () => {
    const addr = await requestAccount()
    try {
      await switchToRobinhoodChain(
        window.ethereum as unknown as Parameters<typeof switchToRobinhoodChain>[0],
      )
    } catch {
      // User declined the network switch — still show them their balances.
    }
    setAccount(addr)
    return addr
  }, [setAccount])

  const disconnect = useCallback(() => {
    setAccount(null)
  }, [setAccount])

  return { account, setAccount, connect, disconnect, hydrated }
}
