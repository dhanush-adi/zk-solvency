/**
 * verify.js — Off-chain Proof Verification Utility
 *
 * Calls the selected adapter's verify() method.
 * Used by prove.js to self-verify before submitting on-chain.
 */

import { getAdapter } from './adapters/index.js';

/**
 * Verify a proof off-chain using the configured adapter.
 *
 * @param {string} proof — hex proof string
 * @param {object} publicInputs — public inputs object
 * @param {string} [adapterName] — override adapter name
 * @returns {Promise<boolean>}
 */
export async function verifyProof(proof, publicInputs, adapterName) {
  const adapter = getAdapter(adapterName);
  return adapter.verify(proof, publicInputs);
}
