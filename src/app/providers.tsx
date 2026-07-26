'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { QUERY_STALE_TIME, QUERY_GC_TIME, QUERY_MAX_RETRIES } from '@/config'
import { ToastProvider } from '@/lib/toast'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME,
        gcTime: QUERY_GC_TIME,
        retry: QUERY_MAX_RETRIES,
        retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  })
}

export function Providers({ children }: { children: ReactNode }) {
  // Created per mount rather than at module scope: a module-level client is
  // shared across every SSR request on the server, which leaks cached data
  // between users as soon as anything prefetches server-side.
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
}
