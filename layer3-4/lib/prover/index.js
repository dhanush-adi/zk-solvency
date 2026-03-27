/**
 * index.js — Layer 5 Prover Entry Point
 *
 * Orchestrates the full prove flow:
 *   1. Build structured inputs (from merkle.js + NullifierRegistry)
 *   2. Select prover adapter
 *   3. Generate proof
 *   4. Verify proof off-chain
 *   5. Return proof artifact
 *
 * This is the single entry point for all proof generation.
 */

import { buildProverInputs } from './inputs.js';
import { getAdapter } from './adapters/index.js';
import { verifyProof } from './verify.js';

/**
 * Generate a verified proof from attested balances.
 *
 * @param {Array<{user_id: string, balance: string}>} attestedBalances
 * @param {bigint|string} totalAssets
 * @param {object} [options]
 * @param {string} [options.adapterName] — override PROVER_ADAPTER
 * @param {string} [options.rpcUrl] — StarkNet RPC URL
 * @param {string} [options.registryAddress] — NullifierRegistry address
 * @param {object} [options.registryState] — mock NullifierRegistry state
 * @returns {Promise<{proof: string, publicInputs: object, verified: boolean}>}
 */
export async function generateProof(attestedBalances, totalAssets, options = {}) {
  // ── 1. Build inputs ────────────────────────────────────────────────
  const inputs = await buildProverInputs(attestedBalances, totalAssets, options);

  // ── 2. Select adapter ──────────────────────────────────────────────
  const adapter = getAdapter(options.adapterName);
  console.log(`🔒 Using prover adapter: ${adapter.name}`);

  // ── 3. Generate proof ──────────────────────────────────────────────
  console.log('⏳ Generating proof...');
  const result = await adapter.prove(inputs);

  // ── 4. Verify off-chain ────────────────────────────────────────────
  console.log('✅ Verifying proof off-chain...');
  const isValid = await verifyProof(result.proof, result.publicInputs, options.adapterName);

  if (!isValid) {
    throw new Error('Off-chain proof verification failed. Aborting.');
  }

  console.log('✅ Proof verified successfully');

  return {
    proof: result.proof,
    publicInputs: result.publicInputs,
    verified: isValid,
  };
}

// Re-export for convenience
export { buildProverInputs } from './inputs.js';
export { getAdapter, listAdapters, registerAdapter } from './adapters/index.js';
export { verifyProof } from './verify.js';
