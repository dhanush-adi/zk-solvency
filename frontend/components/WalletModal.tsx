'use client'

import { useState, useEffect } from 'react'
import { useConnect, useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, CheckCircle2, ExternalLink, Copy, LogOut, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface WalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
  const { connect, connectors, isPending, error, reset } = useConnect()
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [copied, setCopied] = useState(false)

  // Find the MetaMask connector specifically
  const metaMaskConnector = connectors.find(
    (c) => c.id === 'io.metamask' || c.id === 'metaMask' || c.id === 'metaMaskSDK' || c.id === 'injected'
  )

  // Reset error when modal opens
  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  // Show toast on connection success
  useEffect(() => {
    if (isConnected && address) {
      toast.success('Wallet connected', {
        description: `${address.slice(0, 6)}...${address.slice(-4)} on ${chain?.name || 'Ethereum'}`,
      })
    }
  }, [isConnected, address, chain?.name])

  // Handle copy address
  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast.success('Address copied to clipboard', {
        description: `${address.slice(0, 6)}...${address.slice(-4)}`,
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle view on Etherscan
  const handleViewOnEtherscan = () => {
    if (address) {
      window.open(`https://sepolia.etherscan.io/address/${address}`, '_blank')
    }
  }

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect()
    toast.info('Wallet disconnected', {
      description: 'You have been disconnected from your wallet',
    })
    onOpenChange(false)
  }

  // Handle connect MetaMask
  const handleConnectMetaMask = () => {
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector })
    }
  }

  // Check if on wrong network
  const isWrongNetwork = isConnected && chain?.id !== sepolia.id

  // Render connected state
  if (isConnected && address) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-border/50 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Wallet Account
            </DialogTitle>
            <DialogDescription>
              Connected to {chain?.name || 'Ethereum'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20 shadow-inner"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 border border-accent/30 shadow-lg">
                <CheckCircle2 className="w-6 h-6 text-accent" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Active Connection</span>
                <span className="text-xs text-muted-foreground font-medium">
                  {chain?.name || 'Sepolia Testnet'}
                </span>
              </div>
            </motion.div>

            {isWrongNetwork && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20"
              >
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-semibold text-destructive">Unsupported Network</span>
                  <span className="text-xs text-muted-foreground">
                    Switch to Sepolia for full functionality
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    switchChain({ chainId: sepolia.id })
                    toast.info('Switching network', {
                      description: 'Please confirm in your wallet',
                    })
                  }}
                  disabled={isSwitching}
                  className="bg-destructive/10 hover:bg-destructive/20 border-destructive/30"
                >
                  {isSwitching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Switch'
                  )}
                </Button>
              </motion.div>
            )}

            <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Address</span>
                  <code className="text-sm font-mono text-foreground bg-muted/50 px-2 py-1 rounded">
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-9 w-9 hover:bg-accent/10 transition-colors"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleViewOnEtherscan}
                    className="h-9 w-9 hover:bg-accent/10 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="w-full h-11 rounded-xl shadow-lg shadow-destructive/10 hover:shadow-destructive/20 transition-all font-semibold"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Render connection state
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            Connect <span className="text-accent">Wallet</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Choose a wallet to interact with ZK-Solvency
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-6">
          <AnimatePresence mode="wait">
            {/* MetaMask Button */}
            <motion.button
              whileHover={{ scale: 1.02, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConnectMetaMask}
              disabled={isPending || !metaMaskConnector}
              className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 group-hover:border-orange-500/40 transition-colors">
                <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">🦊</span>
              </div>
              
              <div className="flex flex-col flex-1 text-left relative z-10">
                <span className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                  MetaMask
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                  {isPending ? 'Connecting...' : 'Secure browser extension'}
                </span>
              </div>

              {isPending ? (
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
              )}
            </motion.button>
          </AnimatePresence>

          {/* No MetaMask Warning */}
          {!metaMaskConnector && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-destructive">
                  MetaMask Not Detected
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Install the extension to start proving solvency
                </span>
              </div>
              <Button size="sm" variant="link" className="text-destructive font-bold p-0 ml-auto underline" asChild>
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get Extension</a>
              </Button>
            </motion.div>
          )}

          {/* Connection Error */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-destructive">
                  Connection Failed
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {error.message.includes('rejected') ? 'User cancelled the request' : 'An error occurred during connection'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Help Text */}
          <p className="text-xs text-muted-foreground text-center mt-2 px-8 leading-relaxed">
            By connecting, you agree to ZK-Solvency's{' '}
            <span className="underline cursor-pointer hover:text-foreground">Terms</span> and{' '}
            <span className="underline cursor-pointer hover:text-foreground">Privacy Policy</span>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
