// Environment configuration
export const env = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',

  // Wallet Configuration
  walletConnectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID,

  // Contract Addresses (optional)
  usdcContractAddress: process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS,

  // Feature Flags
  enableSSE: process.env.NEXT_PUBLIC_ENABLE_SSE !== 'false',
  enableWalletConnect: process.env.NEXT_PUBLIC_ENABLE_WALLET !== 'false',
} as const;
