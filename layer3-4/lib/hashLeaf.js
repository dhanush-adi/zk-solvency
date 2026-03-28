/**
 * hashLeaf.js — Isolated leaf hashing utility for StarkNet
 *
 * Produces a Pedersen hash of (user_id, balance). Both inputs are
 * converted to felt252 before hashing. user_id is encoded as a
 * short string (max 31 chars).
 *
 * Output: 0x-prefixed hex string (felt252)
 */

import { hash, shortString } from 'starknet';

/**
 * Hash a single (userId, balance) pair into a Merkle leaf using Pedersen.
 *
 * @param {string} userId  — unique account identifier (max 31 ASCII chars)
 * @param {string|bigint} balance — uint256-compatible balance value
 * @returns {string} 0x-prefixed Pedersen hash (felt252)
 */
export function hashLeaf(userId, balance) {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('userId must be a non-empty string');
  }

  // 1. Encode userId as felt252 (short string)
  let userIdFelt;
  try {
    userIdFelt = shortString.encodeShortString(userId);
  } catch (err) {
    throw new Error(`Failed to encode userId "${userId}": ${err.message}`);
  }

  // 2. Convert balance to BigInt
  const balanceFelt = BigInt(balance);

  if (balanceFelt < 0n) {
    throw new Error(`Balance must be non-negative, got ${balanceFelt}`);
  }

  // 3. Compute Pedersen hash
  // Pedersen in starknet.js takes two felts
  return hash.computePedersenHash(userIdFelt, balanceFelt);
}
