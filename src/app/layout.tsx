import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'RH Portfolio — Robinhood Chain',
  description: 'Track your token balances and PNL on Robinhood Chain',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}
