'use client'

import { useMemo } from 'react'
import { formatCurrency } from '@/lib/format'

interface AllocItem {
  symbol: string
  value: number
}

const PIE_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#dc2626', '#0891b2', '#7c3aed', '#9333ea',
  '#c026d3', '#a21caf',
]

export default function AllocationPieChart({ tokens }: { tokens: { symbol: string; value?: number }[] }) {
  const sorted = useMemo(() => {
    return tokens
      .map(t => ({ symbol: t.symbol, value: t.value || 0 }))
      .filter(t => t.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [tokens])

  if (sorted.length === 0) return null

  const total = sorted.reduce((s, t) => s + t.value, 0)
  if (total === 0) return null

  const r = 80
  const cx = 100
  const cy = 100
  const circumference = 2 * Math.PI * r

  let currentAngle = 0
  const slices = sorted.map((item, i) => {
    const fraction = item.value / total
    const angle = fraction * 360
    const startAngle = currentAngle
    currentAngle += angle

    // Convert to radians for SVG arc
    const startRad = ((startAngle - 90) * Math.PI) / 180
    const endRad = ((startAngle + angle - 90) * Math.PI) / 180
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const largeArc = angle > 180 ? 1 : 0

    const pathD = angle >= 360
      ? `M${cx},${cy - r} A${r},${r} 0 1,1 ${cx - 0.01},${cy - r} Z`
      : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`

    return { key: item.symbol, pathD, color: PIE_COLORS[i % PIE_COLORS.length], item, fraction }
  })

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <div className="text-zinc-500 text-xs uppercase tracking-wide mb-4">Asset Allocation</div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Pie */}
        <svg viewBox="0 0 200 200" className="w-44 h-44 shrink-0">
          {slices.map(s => (
            <path key={s.key} d={s.pathD} fill={s.color} stroke="#0a0a0f" strokeWidth="1.5" />
          ))}
        </svg>

        {/* Legend sorted desc */}
        <div className="flex-1 w-full space-y-1.5">
          {sorted.map((item, i) => {
            const pct = ((item.value / total) * 100)
            return (
              <div key={item.symbol} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-zinc-300">{item.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 text-xs w-12 text-right">{pct.toFixed(1)}%</span>
                  <span className="text-zinc-400 text-xs w-20 text-right">{formatCurrency(item.value)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
