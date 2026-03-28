'use client'

import { useState } from 'react'
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { Wallet, LogOut, AlertCircle, Loader2 } from 'lucide-react'
import { WalletModal } from './WalletModal'

export default function WalletConnectClient() {
  const [modalOpen, setModalOpen] = useState(false)

  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({
    address: address,
    chainId: sepolia.id,
  })

  // Check if on wrong network
  const isWrongNetwork = isConnected && chain?.id !== sepolia.id

  return (
    <>
      {!isConnected ? (
        // Not connected - show connect button
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
      ) : (
        // Connected - show address and balance
        <div className="flex items-center gap-2">
          {/* Wrong Network Warning */}
          {isWrongNetwork && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Wrong Network</span>
            </button>
          )}

          {/* Connected Wallet Info */}
          {!isWrongNetwork && (
            <div className="flex items-center gap-2">
              {/* Balance */}
              {balance && (
                <div className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg bg-card border border-border">
                  <span className="text-sm font-mono text-muted-foreground">
                    {parseFloat(balance.formatted).toFixed(4)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {balance.symbol}
                  </span>
                </div>
              )}

              {/* Address */}
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-accent/50 transition-colors"
              >
                <code className="text-xs font-mono text-accent">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </code>
              </button>
            </div>
          )}

          {/* Disconnect Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            title="Manage wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Wallet Modal */}
      <WalletModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}