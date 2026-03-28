import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SSEProvider } from '@/components/providers/SSEProvider'
import { WagmiProvider } from '@/components/providers/WagmiProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLayout } from '@/components/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0e27',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'ZK-Solvency | Proof of Reserves Protocol',
  description: 'Cryptographic proof of reserves with zero-knowledge verification. Real-time solvency proofs for institutional traders.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="font-sans antialiased bg-background text-foreground m-0 p-0">
        <ErrorBoundary>
          <WagmiProvider>
            <QueryProvider>
              <SSEProvider>
                <AppLayout>
                  {children}
                </AppLayout>
                <Analytics />
                <Toaster />
              </SSEProvider>
            </QueryProvider>
          </WagmiProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
