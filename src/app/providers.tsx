'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { QUERY_STALE_TIME, QUERY_GC_TIME, QUERY_MAX_RETRIES } from '@/config'

const queryClient = new QueryClient({
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

export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
