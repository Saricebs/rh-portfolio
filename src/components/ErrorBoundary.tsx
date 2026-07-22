'use client'

import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) { return { error } }

  render() {
    if (this.state.error) {
      return this.props.fallback || (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-zinc-500 text-sm mb-4">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
