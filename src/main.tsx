import './tracing'
import './console-capture'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { Toaster } from 'sonner'
import { config } from './config'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

// Credit badge, bottom-right corner
const CreditBadge = () => (
  <div
    style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      padding: '8px 14px',
      fontSize: '12px',
      fontWeight: 800,
      fontFamily: 'inherit',
      color: '#111',
      background: '#b7ff5e',
      border: '2px solid #111',
      borderRadius: '999px',
      boxShadow: '3px 3px 0 #111',
      zIndex: 9999,
      pointerEvents: 'none',
    }}
  >
    Built by @gemresearches
  </div>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <App />
          <CreditBadge />
          <Toaster position="top-center" />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)

