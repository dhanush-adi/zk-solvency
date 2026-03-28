import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

// Wagmi configuration for MetaMask on Sepolia testnet
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'ZK-Solvency',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://zk-solvency.io',
        iconUrl: 'https://zk-solvency.io/favicon.ico',
      },
    }),
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