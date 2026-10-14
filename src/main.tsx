import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'sonner'
import { WorkspaceProvider } from './hooks/useWorkspace'
import App from './App'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import './styles.css'
import './styles/features.css'
import './styles/responsive.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><BrowserRouter><WorkspaceProvider><App /><Toaster richColors position="bottom-right" /></WorkspaceProvider></BrowserRouter></ErrorBoundary></React.StrictMode>,
)
