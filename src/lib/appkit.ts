import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'

const projectId = '49af56b842b5169707e1a97f47b0cca0'

const robinhoodChain = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://explorer.mainnet.chain.robinhood.com' },
  },
}

const metadata = {
  name: 'RH Portfolio',
  description: 'Robinhood Chain Portfolio Tracker',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://rh-portfolio-ruddy.vercel.app',
  icons: ['https://rh-portfolio-ruddy.vercel.app/rh-logo.png']
}

export const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [robinhoodChain],
  metadata,
  projectId,
  features: {
    analytics: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#8b5cf6',
    '--w3m-color-mix': '#0a0a0f',
    '--w3m-color-mix-strength': 20,
  }
})