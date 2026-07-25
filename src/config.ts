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

// ── Network ──
export const RPC_URLS = [
  'https://rpc.mainnet.chain.robinhood.com',
  'https://robinhood-chain.drpc.org',
  'https://rpc.rhinofi.xyz/rh',
] as const

export const CHAIN_ID = 4663
export const CHAIN_NAME = 'Robinhood Chain'
export const NATIVE_CURRENCY = { name: 'Ether', symbol: 'ETH', decimals: 18 } as const

// ── Blockscout ──
export const BLOCKSCOUT_BASE = 'https://robinhoodchain.blockscout.com'
export const BLOCKSCOUT_API = `${BLOCKSCOUT_BASE}/api`

// ── CoinGecko ──
export const COINGECKO_API = 'https://api.coingecko.com/api/v3'
export const COINGECKO_CATEGORY = 'robinhood-ecosystem'

// ── Contracts ──
export const NFPM_ADDRESS = '0x73991a25c818bf1f1128deaab1492d45638de0d3'

// ── Limits ──
export const FETCH_TIMEOUT = 10_000
export const MAX_TXS = 30
export const FALLBACK_TTL = 300_000

// ── React Query ──
export const QUERY_STALE_TIME = 120_000
export const QUERY_MAX_RETRIES = 2

// ── Revalidation (ISR) ──
export const REVALIDATE_BLOCKSCOUT = 120
export const REVALIDATE_PRICES = 60

// ── CoinGecko reverse map (id → symbol) ──
export const COINGECKO_REVERSE: Record<string, string> = {
  ethereum: 'ETH',
  'global-dollar': 'USDG',
  'usd-coin': 'USDC',
}
