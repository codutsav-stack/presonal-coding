import { Component, type ReactNode } from 'react'
import { Code2, RefreshCw, ArrowLeft } from 'lucide-react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="app-error-fallback" role="alert">
      <span className="brand-icon"><Code2 size={24} /></span>
      <p className="eyebrow">LET’S FIND YOUR WAY BACK</p>
      <h1>Your universe needs a quick refresh.</h1>
      <p>This page could not be displayed. Reload the workspace to reconnect and check your latest saved changes.</p>
      <div><button className="button primary" onClick={() => window.location.reload()}><RefreshCw size={15} />Reload workspace</button><a className="button secondary" href="/"><ArrowLeft size={15} />Back to dashboard</a></div>
    </main>
  }
}
