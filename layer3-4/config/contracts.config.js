/**
 * contracts.config.js — Deployed contract addresses by network
 *
 * For StarkNet (NullifierRegistry, SolvencyVerifier, ProofRegistry).
 * Loaded from env vars. Deploy scripts auto-populate deployment JSONs.
 */

export default {
  starknet: {
    local: {
      rpcUrl: 'http://127.0.0.1:5050',
      nullifierRegistry: process.env.NULLIFIER_REGISTRY_ADDRESS || '',
      solvencyVerifier: process.env.SOLVENCY_VERIFIER_ADDRESS || '',
      proofRegistry: process.env.PROOF_REGISTRY_ADDRESS || '',
    },
    sepolia: {
      rpcUrl: process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io',
      nullifierRegistry: process.env.NULLIFIER_REGISTRY_ADDRESS || '',
      solvencyVerifier: process.env.SOLVENCY_VERIFIER_ADDRESS || '',
      proofRegistry: process.env.PROOF_REGISTRY_ADDRESS || '',
    },
    mainnet: {
      rpcUrl: process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.public.blastapi.io',
      nullifierRegistry: process.env.NULLIFIER_REGISTRY_ADDRESS || '',
      solvencyVerifier: process.env.SOLVENCY_VERIFIER_ADDRESS || '',
      proofRegistry: process.env.PROOF_REGISTRY_ADDRESS || '',
    },
  },
};
