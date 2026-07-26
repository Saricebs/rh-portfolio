import { getPublicProvider } from '@/lib/chain'
import { NFPM_ADDRESS, MAX_LP_POSITIONS } from '@/config'
import { isAddress } from 'ethers'
import { Contract, type AbstractProvider } from 'ethers'

const NFPM_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
]

const ERC20_SHORT = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]

export interface LpPosition {
  tokenId: string
  token0: string
  token0Symbol: string
  token1: string
  token1Symbol: string
  fee: number
  feeLabel: string
  /** Raw Uniswap-V3 liquidity (L = sqrt(x*y)). Unitless — NOT a token amount. */
  liquidity: string
  tickLower: number
  tickUpper: number
  /** Human-readable pending fees, each scaled by its own token's decimals. */
  tokensOwed0: string
  tokensOwed1: string
}

interface TokenMetaCache {
  symbol: string
  decimals: number
}

/**
 * ethers v6 decodes every Solidity integer type to `bigint`. Anything that then
 * takes part in ordinary arithmetic, or reaches React, must be coerced
 * explicitly — mixing a bigint with a number literal throws a TypeError.
 */
function toNum(v: unknown, fallback = 0): number {
  if (typeof v === 'bigint') return Number(v)
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Scale a raw bigint amount by `decimals` without losing precision via Number. */
function formatAmount(raw: unknown, decimals: number): string {
  let v: bigint
  try {
    v = typeof raw === 'bigint' ? raw : BigInt(String(raw ?? '0'))
  } catch {
    return '0'
  }
  if (v === 0n) return '0'
  const neg = v < 0n
  if (neg) v = -v
  const d = Math.min(Math.max(Math.trunc(decimals) || 0, 0), 36)
  const divisor = 10n ** BigInt(d)
  const whole = v / divisor
  const frac = (v % divisor).toString().padStart(d, '0').replace(/0+$/, '')
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`
}

async function getTokenMeta(
  provider: AbstractProvider,
  address: string,
  cache: Map<string, Promise<TokenMetaCache>>,
): Promise<TokenMetaCache> {
  const key = address.toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit

  const pending = (async (): Promise<TokenMetaCache> => {
    const c = new Contract(address, ERC20_SHORT, provider)
    const [symbol, decimals] = await Promise.all([
      c.symbol().catch(() => address.slice(0, 6)),
      c.decimals().catch(() => 18),
    ])
    return { symbol: String(symbol), decimals: toNum(decimals, 18) }
  })()

  cache.set(key, pending)
  return pending
}

function feeToPercent(fee: number): string {
  // Uniswap fee tiers are hundredths of a bip: 500 => 0.05%, 3000 => 0.3%.
  if (!Number.isFinite(fee)) return '—'
  return `${Number((fee / 10_000).toFixed(4))}%`
}

export async function fetchLpPositions(address: string): Promise<LpPosition[]> {
  if (!isAddress(address)) throw new Error('Invalid wallet address')

  const provider = await getPublicProvider()
  const nfpm = new Contract(NFPM_ADDRESS, NFPM_ABI, provider)
  const metaCache = new Map<string, Promise<TokenMetaCache>>()

  const balance = toNum(await nfpm.balanceOf(address))
  const count = Math.min(balance, MAX_LP_POSITIONS)

  const positions = await Promise.all(
    Array.from({ length: count }, (_, i) => i).map(async (i): Promise<LpPosition | null> => {
      try {
        const tokenId: bigint = await nfpm.tokenOfOwnerByIndex(address, i)
        const pos = await nfpm.positions(tokenId)

        const tok0: string = pos.token0
        const tok1: string = pos.token1
        const [meta0, meta1] = await Promise.all([
          getTokenMeta(provider, tok0, metaCache),
          getTokenMeta(provider, tok1, metaCache),
        ])

        const fee = toNum(pos.fee)
        return {
          tokenId: tokenId.toString(),
          token0: tok0,
          token0Symbol: meta0.symbol,
          token1: tok1,
          token1Symbol: meta1.symbol,
          fee,
          feeLabel: feeToPercent(fee),
          liquidity: (pos.liquidity ?? 0n).toString(),
          tickLower: toNum(pos.tickLower),
          tickUpper: toNum(pos.tickUpper),
          tokensOwed0: formatAmount(pos.tokensOwed0, meta0.decimals),
          tokensOwed1: formatAmount(pos.tokensOwed1, meta1.decimals),
        }
      } catch {
        return null
      }
    }),
  )

  return positions.filter((p): p is LpPosition => p !== null)
}
