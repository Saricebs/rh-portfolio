'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  name?: string
}
interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 text-center">
          <div className="text-lg mb-1">⚠</div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">
            {this.props.name || 'Widget'} error
          </h3>
          <p className="text-xs text-zinc-500 mb-3">
            {this.state.error?.message || 'Something went wrong'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 rounded-lg text-xs text-zinc-300 transition-colors"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
