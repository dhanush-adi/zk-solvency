/**
 * index.js — Main entry point for Layer 7 Verification
 *
 * Exports all verification functions for use by the backend and router.
 */

export { verifyInclusion } from './inclusion.js';
export { verifyChain, getChainGaps } from './chain.js';
export * from './errors.js';
