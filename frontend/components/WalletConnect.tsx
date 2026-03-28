'use client'

import dynamic from 'next/dynamic'
import { Wallet, Loader2 } from 'lucide-react'

// Dynamic import with SSR disabled - this prevents hydration mismatch
// because wagmi hooks return different values on server vs client
const WalletConnectInner = dynamic(
  () => import('./WalletConnectInner').then(mod => ({ default: mod.WalletConnectInner })),
  {
    ssr: false,
    loading: () => (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium opacity-50 cursor-not-allowed"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </button>
    ),
  }
)

interface WalletConnectProps {
  className?: string
}

export function WalletConnect({ className }: WalletConnectProps) {
  return (
    <div className={className}>
      <WalletConnectInner />
    </div>
  )
}