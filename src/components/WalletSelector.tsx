'use client'

import { useEffect, useState } from 'react'

// ── Wallet definitions ──

interface WalletDef {
  id: string
  name: string
  icon: string  // inline SVG
  detect: () => boolean
  connect: () => Promise<string>
  actionLabel: (installed: boolean) => string
  actionHref?: string  // external download link when not installed
}

function detectEIP1193(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as Record<string, unknown>).ethereum === 'object'
}

function detectRabby(): boolean {
  if (typeof window === 'undefined') return false
  const eth = (window as unknown as Record<string, unknown>).ethereum as Record<string, unknown> | undefined
  return !!eth?.isRabby
}

const WALLETS: WalletDef[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#E27626"/><path d="M32 8L21.5 15.5L23.5 11.5L32 8Z" fill="#E27626" stroke="#E27626"/><path d="M8 8L18.3 15.6L16.5 11.5L8 8Z" fill="#E27626" stroke="#E27626"/><path d="M29 26L26.5 31L31.5 30L33 26.5L29 26Z" fill="#D7C1B3" stroke="#D7C1B3"/><path d="M7 26.5L8.5 30L13.5 31L11 26L7 26.5Z" fill="#D7C1B3" stroke="#D7C1B3"/><path d="M13 20L11.5 22.5L16.5 22.5L16 20H13Z" fill="#233447" stroke="#233447"/><path d="M27 20L25.5 22.5L23.5 22.5L24 20H27Z" fill="#233447" stroke="#233447"/><path d="M13.5 31L16 22.5L11.5 22.5L13.5 31Z" fill="#CD6116" stroke="#CD6116"/><path d="M24 22.5L26.5 31L28.5 22.5H24Z" fill="#CD6116" stroke="#CD6116"/></svg>`,
    detect: () => detectEIP1193() && !detectRabby(),
    connect: async () => {
      const eth = (window as unknown as Record<string, unknown>).ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
      const accounts = await eth.request({ method: 'eth_requestAccounts' })
      const first = Array.isArray(accounts) ? accounts[0] : undefined
      if (typeof first !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(first)) throw new Error('No account returned')
      return first
    },
    actionLabel: (installed: boolean) => installed ? 'Installed' : 'Install',
  },
  {
    id: 'rabby',
    name: 'Rabby Wallet',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#7C3AED"/><path d="M14 12L20 10L26 12V16L20 14L14 16V12Z" fill="#A78BFA"/><path d="M14 18L20 16L26 18V22L20 20L14 22V18Z" fill="#C4B5FD"/><path d="M14 24L20 22L26 24V28L20 26L14 28V24Z" fill="#DDD6FE"/></svg>`,
    detect: detectRabby,
    connect: async () => {
      const eth = (window as unknown as Record<string, unknown>).ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
      const accounts = await eth.request({ method: 'eth_requestAccounts' })
      const first = Array.isArray(accounts) ? accounts[0] : undefined
      if (typeof first !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(first)) throw new Error('No account returned')
      return first
    },
    actionLabel: (installed: boolean) => installed ? 'Installed' : 'Install',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#3396FF"/><circle cx="20" cy="20" r="10" fill="white"/><path d="M14 18C16 16 18 16 20 18C22 20 24 20 26 18" stroke="#3396FF" stroke-width="1.5" stroke-linecap="round"/><path d="M15 21C16.5 19.5 18.5 19.5 20 21C21.5 22.5 23.5 22.5 25 21" stroke="#3396FF" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    detect: () => true,
    connect: async () => {
      // WalletConnect flow: open URI for mobile wallets.
      // For now, prompt the user to use their mobile wallet or paste address manually.
      throw new Error('WALLETCONNECT_URI')
    },
    actionLabel: () => 'QR Code',
  },
  {
    id: 'robinhood',
    name: 'Robinhood Wallet',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#00C853"/><path d="M12 20C12 15.6 15.6 12 20 12C24.4 12 28 15.6 28 20C28 24.4 24.4 28 20 28C15.6 28 12 24.4 12 20Z" fill="white" opacity="0.9"/><path d="M20 14C22.2 14 24 15.8 24 18C24 20.2 22.2 22 20 22C17.8 22 16 20.2 16 18C16 15.8 17.8 14 20 14Z" fill="#00C853"/><rect x="18" y="22" width="4" height="6" rx="2" fill="white"/></svg>`,
    detect: () => false,
    connect: async () => {
      throw new Error('Open the Robinhood Wallet app on your phone and scan the QR code, or paste your address manually.')
    },
    actionLabel: () => 'Get Started',
    actionHref: 'https://robinhood.com/us/en/about/crypto/',
  },
]

// ── Component ──

interface Props {
  open: boolean
  onClose: () => void
  onConnect: (address: string) => void
}

export default function WalletSelector({ open, onClose, onConnect }: Props) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [installed, setInstalled] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open) return
    setStatus('idle')
    setErrorMsg('')
    // Detect wallets
    const detected: Record<string, boolean> = {}
    for (const w of WALLETS) {
      try { detected[w.id] = w.detect() } catch { detected[w.id] = false }
    }
    setInstalled(detected)
  }, [open])

  if (!open) return null

  const handleConnect = async (wallet: WalletDef) => {
    if (status === 'connecting') return
    setStatus('connecting')
    setErrorMsg('')

    try {
      // Always try to switch to Robinhood Chain before requesting accounts
      const eth = (window as unknown as Record<string, unknown>).ethereum as { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | undefined

      if (wallet.id === 'walletconnect') {
        // Show QR flow — for now open the WalletConnect website as a guide
        setErrorMsg('WalletConnect: Open your mobile wallet, scan the QR code or paste your address in the search bar.')
        setStatus('error')
        return
      }

      if (wallet.id === 'robinhood') {
        // Redirect to download
        if (wallet.actionHref) window.open(wallet.actionHref, '_blank')
        else setErrorMsg('Download Robinhood Wallet from the App Store or Google Play.')
        setStatus('error')
        return
      }

      const address = await wallet.connect()

      // Switch to Robinhood Chain
      if (eth?.request) {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1237' }], // 4663 in hex
          })
        } catch (switchError: unknown) {
          const e = switchError as { code?: number }
          if (e.code === 4902) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x1237',
                chainName: 'Robinhood Chain',
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
                blockExplorerUrls: ['https://robinhoodchain.blockscout.com'],
              }],
            })
          }
        }
      }

      onConnect(address)
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connection failed'
      if (msg === 'WALLETCONNECT_URI') {
        setErrorMsg('WalletConnect: Open your mobile wallet and connect via WalletConnect, or paste your address in the search bar.')
      } else {
        setErrorMsg(/user rejected|denied|rejected/i.test(msg) ? 'Connection cancelled' : msg)
      }
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0c0c14] border border-zinc-800/80 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-slide">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-white">Select a wallet</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 -mr-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Wallets */}
        <div className="px-4 pb-4 space-y-1.5">
          {WALLETS.map(wallet => {
            const isInstalled = installed[wallet.id] ?? false
            const busy = status === 'connecting'
            const label = wallet.actionLabel(isInstalled)
            const isAction = label === 'QR Code' || label === 'Get Started'

            return (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet)}
                disabled={busy}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                {/* Icon */}
                <div className="w-9 h-9 shrink-0 rounded-xl overflow-hidden"
                     dangerouslySetInnerHTML={{ __html: wallet.icon }} />

                {/* Name */}
                <span className="flex-1 text-sm font-medium text-white">{wallet.name}</span>

                {/* Status pill */}
                <span className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                  isInstalled && !isAction
                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700/40'
                }`}>
                  {busy ? 'Connecting...' : label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mx-4 mb-4 px-4 py-2.5 bg-red-900/30 border border-red-800/40 rounded-xl text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Manual address hint */}
        <div className="px-6 pb-5 text-center text-xs text-zinc-600">
          Or paste your wallet address in the search bar above
        </div>
      </div>
    </div>
  )
}
