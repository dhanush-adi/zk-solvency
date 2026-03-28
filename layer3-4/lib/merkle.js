/**
 * merkle.js — Layer 3 Core Merkle Tree Construction for StarkNet
 *
 * Consumes attested balance data and produces:
 *   1. merkleRoot        — felt252 hex string, committed on-chain
 *   2. leaves[]          — ordered array of leaf hex strings (Pedersen)
 *   3. proofs{}          — map of user_id → hexProof array
 *   4. totalLiabilities  — BigInt sum of all balances
 */

import { MerkleTree } from 'merkletreejs';
import { hash } from 'starknet';
import { hashLeaf } from './hashLeaf.js';

/**
 * Pedersen hash wrapper for merkletreejs.
 * merkletreejs concatenates children into a single Buffer before hashing.
 * We split it back into two 32-byte fields for the Pedersen hash.
 *
 * @param {Buffer} data - 64-byte buffer (two 32-byte children)
 * @returns {Buffer} - 32-byte hashed parent
 */
function pedersen(data) {
  if (data.length !== 64) {
    // This should not happen for internal nodes in a binary tree
    // If it's a single leaf being hashed by merkletreejs (if not pre-hashed),
    // we just return it, but we pre-hash leaves.
    return data;
  }

  const left = '0x' + data.subarray(0, 32).toString('hex');
  const right = '0x' + data.subarray(32, 64).toString('hex');
  
  const h = hash.computePedersenHash(left, right);
  
  // Ensure the output is 32 bytes (64 hex chars)
  return Buffer.from(h.slice(2).padStart(64, '0'), 'hex');
}

/**
 * Build a Merkle tree from attested balance objects using Pedersen.
 *
 * @param {Array<{user_id: string, balance: string}>} attestedBalances
 * @returns {{
 *   merkleRoot: string,
 *   leaves: string[],
 *   proofs: Record<string, string[]>,
 *   totalLiabilities: bigint
 * }}
 */
export function buildMerkleTree(attestedBalances) {
  if (!Array.isArray(attestedBalances) || attestedBalances.length === 0) {
    throw new Error('attestedBalances must be a non-empty array');
  }

  const seenIds = new Set();
  let totalLiabilities = 0n;

  for (const entry of attestedBalances) {
    if (seenIds.has(entry.user_id)) {
      throw new Error(`Duplicate user_id detected: ${entry.user_id}`);
    }
    seenIds.add(entry.user_id);
    totalLiabilities += BigInt(entry.balance);
  }

  // ── Leaf hashing (Pedersen) ─────────────────────────────────────
  const leafHexes = attestedBalances.map((entry) =>
    hashLeaf(entry.user_id, entry.balance)
  );

  const leafBuffers = leafHexes.map((hex) =>
    Buffer.from(hex.slice(2).padStart(64, '0'), 'hex')
  );

  // ── Tree construction (StarkNet compatible) ─────────────────────
  // sortPairs: true ensures current <= sibling ordering for hashing
  const tree = new MerkleTree(leafBuffers, pedersen, { sortPairs: true });

  const merkleRoot = '0x' + tree.getRoot().toString('hex');

  // ── Proof generation ────────────────────────────────────────────
  const leaves = leafHexes;
  const proofs = {};

  for (let i = 0; i < attestedBalances.length; i++) {
    const userId = attestedBalances[i].user_id;
    const proof = tree.getHexProof(leafBuffers[i]);
    proofs[userId] = proof;
  }

  return {
    merkleRoot,
    leaves,
    proofs,
    totalLiabilities,
  };
}

/**
 * Verify that a leaf is included in the tree given a proof and root (Pedersen).
 *
 * @param {string} leafHex   — 0x-prefixed leaf hash
 * @param {string[]} proof   — hex proof array
 * @param {string} root      — 0x-prefixed merkle root
 * @returns {boolean}
 */
export function verifyProof(leafHex, proof, root) {
  const leafBuffer = Buffer.from(leafHex.slice(2).padStart(64, '0'), 'hex');
  const rootBuffer = Buffer.from(root.slice(2).padStart(64, '0'), 'hex');
  
  // Must use same hash and sortPairs
  return MerkleTree.verify(proof, leafBuffer, rootBuffer, pedersen, {
    sortPairs: true,
  });
}
