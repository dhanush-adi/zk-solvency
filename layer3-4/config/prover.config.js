/**
 * prover.config.js — Prover environment configuration
 *
 * Centralized config for Layer 5 proof generation.
 */

export default {
  proverAdapter: process.env.PROVER_ADAPTER || 'sp1',
  mockProver: process.env.MOCK_PROVER === 'true',
  cycleIntervalMs: parseInt(process.env.CYCLE_INTERVAL_MS) || 600000,

  starknet: {
    rpcUrl: process.env.STARKNET_RPC_URL || 'http://127.0.0.1:5050',
    accountAddress: process.env.STARKNET_ACCOUNT_ADDRESS,
    privateKey: process.env.STARKNET_PRIVATE_KEY,
  },

  contracts: {
    nullifierRegistry: process.env.NULLIFIER_REGISTRY_ADDRESS,
    solvencyVerifier: process.env.SOLVENCY_VERIFIER_ADDRESS,
    proofRegistry: process.env.PROOF_REGISTRY_ADDRESS,
  },
};
