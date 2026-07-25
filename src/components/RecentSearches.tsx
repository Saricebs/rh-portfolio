'use client'

import { useState, useCallback } from 'react'
import { getRecentSearches, clearRecentSearches, addRecentSearch } from '@/lib/storage'
import { isAddress } from 'ethers'

interface Props {
  onSelect: (address: string) => void
}

export default function RecentSearches({ onSelect }: Props) {
  const [searches, setSearches] = useState(getRecentSearches)

  const handleClear = useCallback(() => {
    clearRecentSearches()
    setSearches([])
  }, [])

  const handleEnter = useCallback((addr: string) => {
    if (isAddress(addr)) {
      addRecentSearch(addr)
      setSearches(getRecentSearches())
      onSelect(addr)
    }
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
            onClick={() => handleEnter(addr)}
            className="text-xs text-zinc-400 bg-zinc-800/50 hover:bg-zinc-700/50 hover:text-zinc-200 rounded-lg px-2.5 py-1 transition-colors"
          >
            {addr.slice(0, 6)}...{addr.slice(-4)}
          </button>
        ))}
      </div>
    </div>
  )
}
