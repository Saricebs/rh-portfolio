'use client'

import { useState, useCallback, useEffect } from 'react'
import { getRecentSearches, clearRecentSearches } from '@/lib/storage'

interface Props {
  onSelect: (address: string) => void
}

export default function RecentSearches({ onSelect }: Props) {
  // Empty on the first client render so it matches the server-rendered HTML;
  // localStorage is read after mount. Seeding state from localStorage directly
  // produced a hydration mismatch.
  const [searches, setSearches] = useState<string[]>([])

  useEffect(() => {
    setSearches(getRecentSearches())
  }, [])

  const handleClear = useCallback(() => {
    clearRecentSearches()
    setSearches([])
  }, [])

  const handleClick = useCallback((addr: string) => {
    onSelect(addr)
  }, [onSelect])

  if (searches.length === 0) return null

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-1 mb-1.5">
        <span className="text-zinc-600 text-xs">Recent Searches</span>
        <button onClick={handleClear} className="text-zinc-700 hover:text-zinc-400 text-xs">Clear</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {searches.map(addr => (
          <button
            key={addr}
            onClick={() => handleClick(addr)}
            className="text-xs text-zinc-400 bg-zinc-800/50 hover:bg-zinc-700/50 hover:text-zinc-200 rounded-lg px-2.5 py-1 transition-colors"
          >
            {addr.slice(0, 6)}...{addr.slice(-4)}
          </button>
        ))}
      </div>
    </div>
  )
}
