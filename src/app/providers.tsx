import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { BarcodeScannerProvider } from '../scanner/BarcodeScannerProvider'
import { LoadingOverlayRoot } from '../shared/components/LoadingOverlay/LoadingOverlay'
import { ToastViewport } from '../shared/components/Toast/Toast'
import { ThemeStyle } from '../shared/theme/ThemeStyle'

const queryClient = new QueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BarcodeScannerProvider>
        <ThemeStyle />
        {children}
        <ToastViewport />
        <LoadingOverlayRoot />
      </BarcodeScannerProvider>
    </QueryClientProvider>
  )
}