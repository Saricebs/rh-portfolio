// ── Robinhood Chain config ──

export interface TokenMeta {
  symbol: string
  address: `0x${string}` | null
  decimals: number
  logo: string
}

export const KNOWN_TOKENS: TokenMeta[] = [
  { symbol: 'ETH', address: null, decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'WETH', address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73', decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'USDG', address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168', decimals: 6, logo: '' },
  { symbol: 'USDC', address: '0x0CE454B6AD88459eD715c3F916c08Af08a466C6D', decimals: 6, logo: '' },
]

export const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'ethereum',
  USDG: 'global-dollar',
  USDC: 'usd-coin',
  'global-dollar': 'global-dollar',
  'usd-coin': 'usd-coin',
}
