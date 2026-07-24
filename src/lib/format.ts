// ── Safe number formatting utilities ──
// Never crash on NaN/Infinity/null/undefined. Clamp fractionDigits to 0–20.

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function safeVal(v: unknown): number {
  return isFiniteNum(v) ? v : 0
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/**
 * Format USD currency value.
 * Invalid/NaN/Infinity → `—`
 */
export function formatCurrency(v: unknown, digits = 2): string {
  if (!isFiniteNum(v)) return '—'
  const d = clamp(digits, 0, 20)
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

/**
 * Format plain number with configurable digits.
 * Invalid/NaN/Infinity → `—`
 */
export function formatNumber(v: unknown, minDigits = 2, maxDigits = 2): string {
  if (!isFiniteNum(v)) return '—'
  const minD = clamp(minDigits, 0, 20)
  const maxD = clamp(maxDigits, 0, 20)
  return v.toLocaleString(undefined, { minimumFractionDigits: Math.min(minD, maxD), maximumFractionDigits: maxD })
}

/**
 * Format percentage (caller passes raw pct like 4.25, not 0.0425).
 * Invalid/NaN/Infinity → `—`
 */
export function formatPercent(v: unknown, digits = 2): string {
  if (!isFiniteNum(v)) return '—'
  const d = clamp(digits, 0, 20)
  return `${v >= 0 ? '+' : ''}${v.toFixed(d)}%`
}

/**
 * Compact number with suffix (K/M/B).
 * Invalid/NaN/Infinity → `—`
 */
export function formatCompactNumber(v: unknown): string {
  if (!isFiniteNum(v)) return '—'
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K'
  return v.toFixed(2)
}

/**
 * Format a value with plus sign for positive numbers (e.g. PnL).
 * Invalid/NaN/Infinity → `—`
 */
export function formatSignedCurrency(v: unknown, digits = 2): string {
  if (!isFiniteNum(v)) return '—'
  const d = clamp(digits, 0, 20)
  const sign = v >= 0 ? '+' : ''
  return `${sign}$${v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

/** Format PnL with sign and optional percent */
export function formatPnl(pnl: unknown, pnlPct?: unknown, digits = 2): string {
  if (!isFiniteNum(pnl)) return '—'
  const d = clamp(digits, 0, 20)
  const sign = pnl >= 0 ? '+' : ''
  let s = `${sign}$${pnl.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`
  if (isFiniteNum(pnlPct)) {
    s += ` (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`
  }
  return s
}

// ── Helpers for template literals ──

/** Safe `v.toFixed(d)` — returns `—` on invalid input */
export function safeFixed(v: unknown, digits = 2): string {
  if (!isFiniteNum(v)) return '—'
  const d = clamp(digits, 0, 20)
  return v.toFixed(d)
}

export { isFiniteNum, safeVal }
