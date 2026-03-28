/**
 * inclusion.js — User Inclusion Verification (Flow A)
 *
 * Verifies if a user's account (id, balance) is included in a specific cycle
 * without revealing the balance to anyone else.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hash, shortString } from 'starknet';
import { getProvider, getProofRegistry, getNullifierRegistry, callContract } from '../lib/starknet.js';
import { hashLeaf } from '../lib/hashLeaf.js';
import { InclusionError } from './errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Reconstructs the Merkle root from a leaf and its proof path.
 * Matches the sortPairs: true logic of lib/merkle.js.
 *
 * @param {string} leafHex - 0x-prefixed leaf hash
 * @param {string[]} proof - hex proof array
 * @returns {string} - 0x-prefixed computed root
 */
function merkleVerifyLocal(leafHex, proof) {
  let current = BigInt(leafHex);

  for (const sibling of proof) {
    const siblingBig = BigInt(sibling);
    
    // sortPairs logic: hash(min, max)
    if (current <= siblingBig) {
      current = BigInt(hash.computePedersenHash(
        '0x' + current.toString(16),
        '0x' + siblingBig.toString(16)
      ));
    } else {
      current = BigInt(hash.computePedersenHash(
        '0x' + siblingBig.toString(16),
        '0x' + current.toString(16)
      ));
    }
  }

  return '0x' + current.toString(16);
}

/**
 * Main inclusion verification function.
 *
 * @param {Object} params
 * @param {string} params.user_id      - Raw user ID string
 * @param {string} params.balance      - Numeric string (uint256)
 * @param {number|null} params.cycle_id - Cycle ID or latest if null
 * @param {string[]|null} params.merkle_proof - Optional proof path
 *
 * @returns {Promise<import('./types').InclusionResult>}
 */
export async function verifyInclusion({ user_id, balance, cycle_id = null, merkle_proof = null }) {
  const registry = getProofRegistry();
  const nullifierReg = getNullifierRegistry();
  
  // 1. Resolve cycle_id
  let targetCycle = cycle_id;
  if (targetCycle === null) {
    const latest = await callContract(registry, 'get_latest_cycle_id');
    targetCycle = Number(latest);
  }

  if (!Number.isSafeInteger(targetCycle) || targetCycle < 0) {
    throw new InclusionError('invalid_cycle_id', { targetCycle });
  }

  // 2. Fetch on-chain proof record
  // get_proof returns (cycle_id, merkle_root, assets, liabilities, nullifier_count, timestamp, verified)
  let record;
  try {
    record = await callContract(registry, 'get_proof', [targetCycle]);
  } catch (err) {
    throw new InclusionError('cycle_record_missing', { targetCycle, originalError: err.message });
  }

  // extract merkle_root (felt252 is 2nd in tuple)
  const onChainRoot = '0x' + (record[1] || record.merkle_root).toString(16);
  const nullifierCount = Number(record[4] || record.nullifier_count);

  // 3. Compute leaf (Pedersen)
  const leaf = hashLeaf(user_id, balance);

  // 4. Resolve merkle_proof
  let finalProof = merkle_proof;
  if (!finalProof) {
    const artifactPath = path.join(ROOT, 'proofs', `${targetCycle}.json`);
    if (!fs.existsSync(artifactPath)) {
      throw new InclusionError('proof_artifact_missing', { targetCycle });
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
    // proofs map is indexed by leaf in some designs, or user_id in others.
    // The prompt says: "/proofs/ stores proofs keyed by leaf hex."
    finalProof = artifact.proofs[leaf];
    
    if (!finalProof) {
      return {
        included: false,
        cycle_id: targetCycle,
        merkle_root: onChainRoot,
        nullifier_count: nullifierCount,
        leaf,
        reason: 'leaf_not_in_artifact',
        verified_at: Math.floor(Date.now() / 1000)
      };
    }
  }

  // 5. Verify Merkle proof locally
  const computedRoot = merkleVerifyLocal(leaf, finalProof);
  if (computedRoot !== onChainRoot) {
    return {
      included: false,
      cycle_id: targetCycle,
      merkle_root: onChainRoot,
      nullifier_count: nullifierCount,
      leaf,
      reason: 'root_mismatch',
      verified_at: Math.floor(Date.now() / 1000)
    };
  }

  // 6. Verify nullifier inclusion on-chain (leaf was registered this cycle)
  let isIncludedOnChain = false;
  try {
    isIncludedOnChain = await callContract(nullifierReg, 'is_included', [leaf]);
  } catch (err) {
    console.warn(`[WARN] Nullifier check failed for leaf ${leaf}:`, err.message);
  }

  if (!isIncludedOnChain) {
    return {
      included: false,
      cycle_id: targetCycle,
      merkle_root: onChainRoot,
      nullifier_count: nullifierCount,
      leaf,
      reason: 'not_nullified',
      verified_at: Math.floor(Date.now() / 1000)
    };
  }

  // 7. Return InclusionResult
  return {
    included: true,
    cycle_id: targetCycle,
    merkle_root: onChainRoot,
    nullifier_count: nullifierCount,
    leaf,
    reason: null,
    verified_at: Math.floor(Date.now() / 1000)
  };
}
