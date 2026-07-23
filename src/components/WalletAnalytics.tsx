'use client'

import { useMemo } from 'react'

const STABLECOINS = new Set(['USDG', 'USDC', 'USDT', 'DAI', 'FDUSD', 'TUSD', 'BUSD'])

interface Props {
  tokens: { symbol: string; value?: number }[]
}

export default function WalletAnalytics({ tokens }: Props) {
  const stats = useMemo(() => {
    const withVal = tokens.filter(t => (t.value ?? 0) > 0)
    if (withVal.length === 0) return null

    const total = withVal.reduce((s, t) => s + (t.value ?? 0), 0)
    if (total === 0) return null

    // Largest holding
    const sorted = [...withVal].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    const largest = sorted[0]

    // Stablecoin %
    const stableVal = withVal
      .filter(t => STABLECOINS.has(t.symbol.toUpperCase()))
      .reduce((s, t) => s + (t.value ?? 0), 0)
    const stablePct = (stableVal / total) * 100

    // HHI-based concentration (sum of squared shares)
    const shares = withVal.map(t => (t.value ?? 0) / total)
    const hhi = shares.reduce((s, sh) => s + sh * sh, 0)

    // Risk score 0–100 (lower = safer)
    // HHI component: 0–60 points (higher concentration = higher risk)
    // Stable component: up to -20 points (more stablecoins = lower risk)
    // Count component: 0–20 points (fewer assets = higher risk)
    const hhiRisk = Math.round(hhi * 60)
    const stableBonus = Math.round(Math.min(stablePct / 5, 20))  // up to 20 pts off
    const countRisk = Math.round(Math.max(0, (5 - withVal.length) * 4))  // 4 pts per missing asset below 5
    const riskScore = Math.min(100, Math.max(0, hhiRisk - stableBonus + countRisk))

    // Diversification score 0–100 (inverse of concentration, normalized)
    // 1 - HHI, scaled so that HHI=1 → 0, HHI=0 → 100
    const divScore = Math.round((1 - hhi) / (1 - 1 / withVal.length) * 100)

    return { largest, stablePct, riskScore, divScore, total, stableVal }
  }, [tokens])

  if (!stats) return null

  const riskLabel = stats.riskScore <= 30 ? 'Low' : stats.riskScore <= 60 ? 'Medium' : 'High'
  const riskColor = stats.riskScore <= 30 ? 'text-emerald-400' : stats.riskScore <= 60 ? 'text-amber-400' : 'text-red-400'
  const divLabel = stats.divScore >= 70 ? 'Good' : stats.divScore >= 40 ? 'Fair' : 'Poor'
  const divColor = stats.divScore >= 70 ? 'text-emerald-400' : stats.divScore >= 40 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="mb-6">
      <div className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Wallet Analytics</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Largest Holding" value={`${stats.largest.symbol}`} 
              sub={`${((stats.largest.value ?? 0) / (stats.total || 1) * 100).toFixed(1)}% of portfolio`} />
        <Card label="Stablecoin %" value={`${stats.stablePct.toFixed(1)}%`}
              sub={`$${stats.stableVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <Card label="Risk Score" value={`${stats.riskScore}/100`} valueClass={riskColor}
              sub={riskLabel} />
        <Card label="Diversification" value={`${stats.divScore}/100`} valueClass={divColor}
              sub={divLabel} />
      </div>
    </div>
  )
}

function Card({ label, value, sub, valueClass }: { label: string; value: string; sub: string; valueClass?: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-bold ${valueClass ?? 'text-white'}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>
    </div>
  )
}
