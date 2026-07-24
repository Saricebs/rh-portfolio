import { BrowserProvider, Contract, formatUnits, JsonRpcProvider, type AbstractProvider } from 'ethers'
import type { Eip1193Provider } from 'ethers'
import { getPublicProvider } from '@/lib/chain'

const NFPM_ADDRESS = '0x73991a25c818bf1f1128deaab1492d45638de0d3'

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
  liquidity: string
  tickLower: number
  tickUpper: number
  tokensOwed0: string
  tokensOwed1: string
  estimatedValueUsd?: number
  sharePercent?: number
}

async function getWalletProvider(): Promise<BrowserProvider> {
  if (!window.ethereum) throw new Error('Install MetaMask or Robinhood Wallet')
  return new BrowserProvider(window.ethereum as Eip1193Provider)
}

async function getTokenSymbol(provider: AbstractProvider, address: string): Promise<string> {
  try {
    const c = new Contract(address, ERC20_SHORT, provider)
    return await c.symbol()
  } catch { return address.slice(0, 6) }
}

async function getTokenDecimals(provider: AbstractProvider, address: string): Promise<number> {
  try {
    const c = new Contract(address, ERC20_SHORT, provider)
    return await c.decimals()
  } catch { return 18 }
}

function feeToPercent(fee: number): string {
  return (fee / 10000) + '%'
}

export async function fetchLpPositions(address: string): Promise<LpPosition[]> {
  const provider = await getPublicProvider() as JsonRpcProvider
  const nfpm = new Contract(NFPM_ADDRESS, NFPM_ABI, provider)

  const balance: bigint = await nfpm.balanceOf(address)
  const positions: LpPosition[] = []

  for (let i = 0; i < Number(balance); i++) {
    try {
      const tokenId: bigint = await nfpm.tokenOfOwnerByIndex(address, i)
      const pos = await nfpm.positions(tokenId)

      const tok0 = pos.token0
      const tok1 = pos.token1
      const [sym0, sym1, dec0, dec1] = await Promise.all([
        getTokenSymbol(provider, tok0),
        getTokenSymbol(provider, tok1),
        getTokenDecimals(provider, tok0),
        getTokenDecimals(provider, tok1),
      ])

      positions.push({
        tokenId: tokenId.toString(),
        token0: tok0,
        token0Symbol: sym0,
        token1: tok1,
        token1Symbol: sym1,
        fee: pos.fee,
        feeLabel: feeToPercent(pos.fee),
        liquidity: formatUnits(pos.liquidity, dec0),
        tickLower: pos.tickLower,
        tickUpper: pos.tickUpper,
        tokensOwed0: formatUnits(pos.tokensOwed0, dec0),
        tokensOwed1: formatUnits(pos.tokensOwed1, dec1),
      })
    } catch { continue }
  }

  return positions
}
