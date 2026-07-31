'use client'

import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { useCallback, useEffect, useState } from 'react'
import { isAddress } from 'ethers'

export function useAccount() {
  const { open } = useAppKit()
  const { address: appKitAddress, isConnected } = useAppKitAccount()
  const { disconnect: appKitDisconnect } = useDisconnect()
  
  const [hydrated, setHydrated] = useState(false)
  const [manualAddress, setManualAddress] = useState<string | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  // Prefer AppKit address if connected, otherwise fall back to manual address
  const address = (isConnected && appKitAddress) ? appKitAddress : manualAddress

  const connect = useCallback(async () => {
    open()
    return address || ''
  }, [open, address])

  const disconnect = useCallback(() => {
    setManualAddress(null)
    appKitDisconnect()
  }, [appKitDisconnect])

  const setAccount = useCallback((addr: string | null) => {
    setManualAddress(addr)
  }, [])

  return { 
    account: address && isAddress(address) ? address : null, 
    isConnected,
    setAccount, 
    connect, 
    disconnect, 
    hydrated 
  }
}