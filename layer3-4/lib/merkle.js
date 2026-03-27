/**
 * merkle.js — Layer 3 Core Merkle Tree Construction
 *
 * Consumes attested balance data from Layers 1+2 and produces:
 *   1. merkleRoot        — bytes32 hex string, committed on-chain
 *   2. leaves[]          — ordered array of leaf hex strings
 *   3. proofs{}          — map of user_id → hexProof array
 *   4. totalLiabilities  — BigInt sum of all balances (prover input for Layer 5)
 *
 * This is a pure module with no side effects on import.
 */

import { MerkleTree } from 'merkletreejs';
import { ethers } from 'ethers';
import { hashLeaf } from './hashLeaf.js';

/**
 * keccak256 wrapper compatible with merkletreejs's hash function signature.
 * Accepts a Buffer and returns a Buffer.
 *
 * @param {Buffer} data
 * @returns {Buffer}
 */
function keccak256(data) {
  const hex = ethers.keccak256(data);
  return Buffer.from(hex.slice(2), 'hex');
}

/**
 * Build a Merkle tree from attested balance objects.
 *
 * @param {Array<{user_id: string, balance: string}>} attestedBalances
 *   Verified JSON array from Layer 2 output.
 *
 * @returns {{
 *   merkleRoot: string,
 *   leaves: string[],
 *   proofs: Record<string, string[]>,
 *   totalLiabilities: bigint
 * }}
 */
export function buildMerkleTree(attestedBalances) {
  // ── Validation ──────────────────────────────────────────────────
  if (!Array.isArray(attestedBalances) || attestedBalances.length === 0) {
    throw new Error('attestedBalances must be a non-empty array');
  }

  const seenIds = new Set();
  let totalLiabilities = 0n;

  for (const entry of attestedBalances) {
    if (typeof entry.user_id !== 'string' || entry.user_id.length === 0) {
      throw new Error('Each entry must have a non-empty user_id string');
    }

    if (seenIds.has(entry.user_id)) {
      throw new Error(`Duplicate user_id detected: ${entry.user_id}`);
    }
    seenIds.add(entry.user_id);

    let bal;
    try {
      bal = BigInt(entry.balance);
    } catch {
      throw new Error(
        `Balance for user "${entry.user_id}" is not a valid numeric string: ${entry.balance}`
      );
    }

    if (bal < 0n) {
      throw new Error(
        `Negative balance for user "${entry.user_id}": ${entry.balance}`
      );
    }

    totalLiabilities += bal;
  }

  // ── Leaf hashing ────────────────────────────────────────────────
  const leafHexes = attestedBalances.map((entry) =>
    hashLeaf(entry.user_id, entry.balance)
  );

  const leafBuffers = leafHexes.map((hex) =>
    Buffer.from(hex.slice(2), 'hex')
  );

  // ── Tree construction ───────────────────────────────────────────
  const tree = new MerkleTree(leafBuffers, keccak256, { sortPairs: true });

  const merkleRoot = '0x' + tree.getRoot().toString('hex');

  // ── Proof generation ────────────────────────────────────────────
  const leaves = leafHexes; // ordered hex strings
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
 * Verify that a leaf is included in the tree given a proof and root.
 *
 * @param {string} leafHex   — 0x-prefixed leaf hash
 * @param {string[]} proof   — hex proof array from proofs[user_id]
 * @param {string} root      — 0x-prefixed merkle root
 * @returns {boolean}
 */
export function verifyProof(leafHex, proof, root) {
  const leafBuffer = Buffer.from(leafHex.slice(2), 'hex');
  const rootBuffer = Buffer.from(root.slice(2), 'hex');
  return MerkleTree.verify(proof, leafBuffer, rootBuffer, keccak256, {
    sortPairs: true,
  });
}
