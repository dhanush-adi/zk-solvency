import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Wagmi configuration for MetaMask on Sepolia testnet
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected({ target: 'metaMask' }),
  ],
  transports: {
    [sepolia.id]: http(),
  },
})

// Declare module for type safety
declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}