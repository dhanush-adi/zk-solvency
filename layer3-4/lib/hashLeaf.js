/**
 * hashLeaf.js — Isolated leaf hashing utility
 *
 * Produces a keccak256 hash of (user_id, balance) using Solidity-compatible
 * packed encoding. This module is intentionally minimal so it can be imported
 * by the Layer 5 zk-STARK prover without pulling in the full Merkle module.
 *
 * Output: 0x-prefixed hex string (bytes32)
 */

import { ethers } from 'ethers';

/**
 * Hash a single (userId, balance) pair into a Merkle leaf.
 *
 * @param {string} userId  — unique account identifier
 * @param {string|bigint} balance — uint256-compatible balance value
 * @returns {string} 0x-prefixed keccak256 hash (bytes32)
 */
export function hashLeaf(userId, balance) {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('userId must be a non-empty string');
  }

  const bal = BigInt(balance);

  if (bal < 0n) {
    throw new Error(`Balance must be non-negative, got ${bal}`);
  }

  return ethers.solidityPackedKeccak256(
    ['string', 'uint256'],
    [userId, bal]
  );
}
