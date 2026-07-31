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

// ── CoinGecko ──
export const COINGECKO_API = 'https://api.coingecko.com/api/v3'
export const COINGECKO_CATEGORY = 'robinhood-ecosystem'

// ── Contracts ──
export const NFPM_ADDRESS = '0x73991a25c818bf1f1128deaab1492d45638de0d3'

// ── Limits ──
export const FETCH_TIMEOUT = 15_000
export const MAX_TXS = 100
export const FALLBACK_TTL = 300_000
/** Hard cap on NFPM positions walked per wallet — bounds RPC fan-out. */
export const MAX_LP_POSITIONS = 50
/** DexScreener /latest/dex/tokens/{addresses} accepts at most 30 comma-separated addresses. */
export const DEXSCREENER_BATCH = 30

// ── API route rate limiting (per instance, per IP) ──
export const RATE_LIMIT_WINDOW = 60_000
export const RATE_LIMIT_MAX = 300

// ── React Query ──
export const QUERY_STALE_TIME = 120_000
export const QUERY_GC_TIME = 300_000
export const QUERY_MAX_RETRIES = 2

// ── Revalidation (ISR) ──
export const REVALIDATE_BLOCKSCOUT = 120
export const REVALIDATE_PRICES = 60
export const REVALIDATE_TRENDING = 120

// ── CoinGecko reverse map ──
// NOTE: intentionally NOT used for price mapping — it is lossy (ETH and WETH
// share the `ethereum` id, so a reverse lookup silently drops WETH). Kept only
// for display helpers that need a canonical symbol for an id.
export const COINGECKO_REVERSE: Record<string, string> = {
  ethereum: 'ETH',
  'global-dollar': 'USDG',
  'usd-coin': 'USDC',
}
