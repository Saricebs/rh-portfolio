'use client'

import { useLpQuery } from '@/lib/blockscout'
import { BLOCKSCOUT_BASE, NFPM_ADDRESS } from '@/config'
import { formatCompactNumber } from '@/lib/format'

interface Props {
  address: string
}

export default function LpDashboard({ address }: Props) {
  const { data, isLoading } = useLpQuery(address)
  const positions = data?.data ?? []
  const warning = data?.warning ?? null

  return (
    <div className="mt-8">
      <div className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Liquidity Positions</div>

      {warning && (
        <div className="mb-3 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-xs text-amber-300">
          {warning}
        </div>
      )}

      {isLoading ? (
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
              href={`${BLOCKSCOUT_BASE}/token/${NFPM_ADDRESS}/instance/${pos.tokenId}`}
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-zinc-600">Liquidity</div>
                  <div className="text-zinc-300 font-mono">{parseFloat(pos.liquidity) > 0 ? formatCompactNumber(parseFloat(pos.liquidity)) : '0'}</div>
                </div>
                <div>
                  <div className="text-zinc-600">Range</div>
                  <div className="text-zinc-300">{pos.tickLower} → {pos.tickUpper}</div>
                </div>
                <div>
                  <div className="text-zinc-600">Pending {pos.token0Symbol}</div>
                  <div className="text-zinc-300 font-mono">{parseFloat(pos.tokensOwed0) > 0 ? formatCompactNumber(parseFloat(pos.tokensOwed0)) : '0'}</div>
                </div>
                <div>
                  <div className="text-zinc-600">Pending {pos.token1Symbol}</div>
                  <div className="text-zinc-300 font-mono">{parseFloat(pos.tokensOwed1) > 0 ? formatCompactNumber(parseFloat(pos.tokensOwed1)) : '0'}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
