import { http, createConfig } from 'wagmi'
import { type Chain } from 'viem'

export const robinhoodChain = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' },
  },
} as const satisfies Chain

export const config = createConfig({
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http(),
  },
})

// Token address list for Robinhood Chain — extend as needed
export const KNOWN_TOKENS = [
  { symbol: 'ETH', address: null, decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'WETH', address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73', decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'USDG', address: '0x96F47aD2A9C0582736016B94b504C924E28856c5', decimals: 18, logo: '' },
  { symbol: 'USDC', address: '0x...', decimals: 6, logo: '' },
]

export const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'ethereum',
  USDG: 'paxos-gold',
  USDC: 'usd-coin',
}
