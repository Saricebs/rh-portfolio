'use client'

import { useState, useEffect } from 'react'
import { fetchLpPositions, type LpPosition } from '@/lib/lp'

const BLOCKSCOUT = 'https://robinhoodchain.blockscout.com'

interface Props {
  address: string
}

export default function LpDashboard({ address }: Props) {
  const [positions, setPositions] = useState<LpPosition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchLpPositions(address)
      .then(setPositions)
      .catch(e => console.warn("LP fetch failed", e))
      .finally(() => setLoading(false))
  }, [address])

  return (
    <div className="mt-8">
      <div className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Liquidity Positions</div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 animate-pulse space-y-2">
              <div className="h-4 w-32 bg-zinc-800 rounded" />
              <div className="h-3 w-48 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="text-zinc-600 text-sm text-center py-8 border border-dashed border-zinc-800 rounded-xl">
          No liquidity positions found
        </div>
      ) : (
        <div className="space-y-2">
          {positions.map(pos => (
            <a
              key={pos.tokenId}
              href={`${BLOCKSCOUT}/token/${NFPM_ADDRESS}/instance/${pos.tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-xs font-bold">
                    LP
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {pos.token0Symbol} / {pos.token1Symbol}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {pos.feeLabel} · #{pos.tokenId}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-zinc-600">Liquidity</div>
                  <div className="text-zinc-300 font-mono">{abbreviate(pos.liquidity)}</div>
                </div>
                <div>
                  <div className="text-zinc-600">Range</div>
                  <div className="text-zinc-300">{pos.tickLower} → {pos.tickUpper}</div>
                </div>
                <div>
                  <div className="text-zinc-600">Pending {pos.token0Symbol}</div>
                  <div className="text-zinc-300 font-mono">{abbreviate(pos.tokensOwed0)}</div>
                </div>
                <div>
                  <div className="text-zinc-600">Pending {pos.token1Symbol}</div>
                  <div className="text-zinc-300 font-mono">{abbreviate(pos.tokensOwed1)}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const NFPM_ADDRESS = '0x73991a25c818bf1f1128deaab1492d45638de0d3'

function abbreviate(val: string): string {
  const n = parseFloat(val)
  if (n === 0) return '0'
  if (n > 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n > 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n > 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toFixed(4)
}
