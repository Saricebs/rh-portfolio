'use client'

import { useMemo, useState } from 'react'

interface PortfolioChartProps {
  timestamps: number[]
  values: number[]
}

type Range = '24H' | '7D' | '30D'

function sliceRange(ts: number[], vals: number[], range: Range) {
  const len = vals.length
  if (len === 0) return { timestamps: [], values: [] }
  let start = 0
  if (range === '24H') start = Math.max(0, len - 48)    // ~30min intervals
  else if (range === '7D') start = Math.max(0, len - 336) // ~30min * 7
  else start = 0
  return { timestamps: ts.slice(start), values: vals.slice(start) }
}

export default function PortfolioChart({ timestamps, values }: PortfolioChartProps) {
  const [range, setRange] = useState<Range>('7D')

  const { timestamps: slicedTs, values: slicedVals } = useMemo(
    () => sliceRange(timestamps, values, range),
    [timestamps, values, range]
  )

  if (slicedVals.length < 2) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-center text-sm text-zinc-500">
        Chart data loading…
      </div>
    )
  }

  const minVal = Math.min(...slicedVals)
  const maxVal = Math.max(...slicedVals)
  const rangeVal = maxVal - minVal || 1
  const width = 600
  const height = 220
  const pad = { top: 12, bottom: 28, left: 8, right: 8 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const stepX = chartW / (slicedVals.length - 1)

  const points = slicedVals.map((v, i) => {
    const x = pad.left + i * stepX
    const y = pad.top + chartH - ((v - minVal) / rangeVal) * chartH
    return `${x},${y}`
  })

  const pathD = `M${points.join(' L')}`

  const firstVal = slicedVals[0]
  const lastVal = slicedVals[slicedVals.length - 1]
  const change = ((lastVal - firstVal) / firstVal) * 100
  const up = change >= 0
  const color = up ? '#34d399' : '#f87171'

  function formatDate(ts: number) {
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  function formatTime(ts: number) {
    const d = new Date(ts)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const val = minVal + rangeVal * f
    const y = pad.top + chartH - f * chartH
    return { y, label: `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 0 })}` }
  })

  const ranges: Range[] = ['24H', '7D', '30D']

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-zinc-500 text-xs uppercase tracking-wide">Portfolio Value</div>
          <div className="text-lg font-bold mt-0.5">
            ${lastVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? '+' : ''}{change.toFixed(2)}% ({range})
          </div>
        </div>
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                range === r ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-48" preserveAspectRatio="xMidYMid slice">
        {/* Grid lines */}
        {yLabels.map((yl, i) => (
          <line
            key={i}
            x1={pad.left} y1={yl.y}
            x2={width - pad.right} y2={yl.y}
            stroke="rgb(39 39 42)"
            strokeWidth="1"
          />
        ))}
        {/* Area fill */}
        <path
          d={`${pathD} L${pad.left + chartW},${pad.top + chartH} L${pad.left},${pad.top + chartH} Z`}
          fill={`url(#grad-${up ? 'up' : 'down'})`}
          opacity="0.15"
        />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Definitions */}
        <defs>
          <linearGradient id="grad-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* X-axis labels */}
        {slicedTs.length > 1 && (
          <>
            <text x={pad.left} y={height - 4} fill="rgb(113 113 122)" fontSize="10">
              {range === '24H' ? formatTime(slicedTs[0]) : formatDate(slicedTs[0])}
            </text>
            <text x={pad.left + chartW} y={height - 4} fill="rgb(113 113 122)" fontSize="10" textAnchor="end">
              {range === '24H' ? formatTime(slicedTs[slicedTs.length - 1]) : formatDate(slicedTs[slicedTs.length - 1])}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
