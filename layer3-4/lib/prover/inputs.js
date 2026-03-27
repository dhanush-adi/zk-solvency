/**
 * inputs.js — Layer 5 Prover Input Builder
 *
 * Builds the structured prover input object from:
 *   - attestedBalances (Layer 2 output)
 *   - totalAssets (exchange backend)
 *   - NullifierRegistry on-chain state (via starknet.js)
 *
 * Imports: merkle.js output, NullifierRegistry contract
 */

import { buildMerkleTree } from '../merkle.js';
import { RpcProvider, Contract, json } from 'starknet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

/**
 * Build structured prover inputs from attested balances and total assets.
 *
 * @param {Array<{user_id: string, balance: string}>} attestedBalances
 * @param {bigint|string} totalAssets — declared total assets
 * @param {object} [options] — optional overrides
 * @param {string} [options.rpcUrl] — StarkNet RPC URL
 * @param {string} [options.registryAddress] — NullifierRegistry address
 * @param {object} [options.registryState] — mock state for testing
 * @returns {Promise<{publicInputs: object, privateInputs: object}>}
 */
export async function buildProverInputs(attestedBalances, totalAssets, options = {}) {
  // ── 1. Build merkle tree ──────────────────────────────────────────
  const { merkleRoot, leaves, proofs, totalLiabilities } = buildMerkleTree(attestedBalances);

  // ── 2. Fetch on-chain state ───────────────────────────────────────
  let cycleId, nullifierCount, onChainMerkleRoot;

  if (options.registryState) {
    // Mock mode for testing
    cycleId = BigInt(options.registryState.cycleId);
    nullifierCount = BigInt(options.registryState.nullifierCount);
    onChainMerkleRoot = options.registryState.merkleRoot;
  } else {
    const state = await fetchRegistryState(options.rpcUrl, options.registryAddress);
    cycleId = state.cycleId;
    nullifierCount = state.nullifierCount;
    onChainMerkleRoot = state.merkleRoot;
  }

  // ── 3. Validate nullifier count matches ───────────────────────────
  if (Number(nullifierCount) !== attestedBalances.length) {
    throw new Error(
      `Nullifier count mismatch: on-chain=${nullifierCount}, ` +
      `attestedBalances.length=${attestedBalances.length}. ` +
      `Aborting proof generation.`
    );
  }

  // ── 4. Build input structure ──────────────────────────────────────
  const balances = attestedBalances.map(e => BigInt(e.balance));
  const userIds = attestedBalances.map(e => e.user_id);
  const merkleProofPaths = attestedBalances.map(e => proofs[e.user_id]);

  return {
    publicInputs: {
      merkleRoot,           // bytes32 hex
      totalAssets: BigInt(totalAssets),
      cycleId,              // BigInt from contract
      nullifierCount,       // BigInt from contract
      totalLiabilities,     // BigInt (sum of balances)
    },
    privateInputs: {
      balances,             // BigInt[]
      userIds,              // string[]
      merkleProofs: merkleProofPaths, // hex[][] (one proof path per user)
    },
  };
}

/**
 * Fetch NullifierRegistry state from StarkNet.
 * @private
 */
async function fetchRegistryState(rpcUrl, registryAddress) {
  const envRpc = process.env.STARKNET_RPC_URL || 'http://127.0.0.1:5050';
  const rpc = rpcUrl || envRpc;

  const addr = registryAddress || process.env.NULLIFIER_REGISTRY_ADDRESS;
  if (!addr) {
    throw new Error('NULLIFIER_REGISTRY_ADDRESS not set');
  }

  const provider = new RpcProvider({ nodeUrl: rpc });

  // Load Sierra ABI
  const sierraPath = path.join(
    ROOT,
    'cairo/target/dev/zk_solvency_layer4_NullifierRegistry.contract_class.json'
  );

  if (!fs.existsSync(sierraPath)) {
    throw new Error(`Sierra ABI not found at ${sierraPath}. Run scarb build first.`);
  }

  const sierra = json.parse(fs.readFileSync(sierraPath, 'utf-8'));
  const contract = new Contract(sierra.abi, addr, provider);

  const [cycleId, nullifierCount, merkleRoot] = await Promise.all([
    contract.call('get_cycle_id'),
    contract.call('get_nullifier_count'),
    contract.call('get_merkle_root'),
  ]);

  return {
    cycleId: BigInt(cycleId),
    nullifierCount: BigInt(nullifierCount),
    merkleRoot: '0x' + BigInt(merkleRoot).toString(16),
  };
}
