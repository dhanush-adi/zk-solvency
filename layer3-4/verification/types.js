/**
 * types.js — Shared JSDoc type definitions for Layer 7 verification
 *
 * Use these types in JSDoc for IDE support and clarity.
 */

/**
 * @typedef {Object} ProofRecord
 * @property {number} cycle_id          - u64 on-chain
 * @property {string} merkle_root       - felt252 hex string
 * @property {bigint} total_assets      - u256 reconstructed (low + high)
 * @property {bigint} total_liabilities - u256 reconstructed
 * @property {number} nullifier_count   - u64 on-chain
 * @property {number} timestamp         - u64 on-chain (Unix seconds)
 * @property {number} previous_cycle_id - u64 on-chain
 * @property {boolean} verified         - proof status
 */

/**
 * @typedef {Object} InclusionResult
 * @property {boolean} included         - overall result
 * @property {number} cycle_id          - cycle verified against
 * @property {string} merkle_root       - felt252 hex from on-chain
 * @property {number} nullifier_count   - count from on-chain
 * @property {string} leaf             - user's leaf hash (safe to return)
 * @property {string|null} reason       - error code if failed
 * @property {number} verified_at       - result timestamp
 */

/**
 * @typedef {Object} ChainIssue
 * @property {'gap' | 'root_tampered' | 'timestamp_anomaly' | 'artifact_missing' | 'record_inconsistent'} type
 * @property {'critical' | 'warning'} severity
 * @property {number} at_cycle
 * @property {string} detail
 */

/**
 * @typedef {Object} ChainResult
 * @property {number} from_cycle        - scan start
 * @property {number} to_cycle          - scan end
 * @property {number} cycles_checked    - count
 * @property {boolean} chain_intact     - true if zero critical issues
 * @property {ChainIssue[]} issues      - gap/tamper details
 * @property {number} verified_at       - scan timestamp
 */

export default {}; // No runtime code needed
