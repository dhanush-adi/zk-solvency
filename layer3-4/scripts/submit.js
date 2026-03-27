/**
 * submit.js — Submit Layer 3 output to Layer 4 on StarkNet
 *
 * Connects the Merkle tree output from merkle.js to the NullifierRegistry
 * on StarkNet via a commitCycle transaction.
 *
 * Usage:
 *   node scripts/submit.js
 *
 * Requires:
 *   - deployments/NullifierRegistry.json (created by deploy.js)
 *   - STARKNET_RPC_URL, STARKNET_PRIVATE_KEY, STARKNET_ACCOUNT_ADDRESS in .env
 */

import { RpcProvider, Account, Contract, json, cairo } from 'starknet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildMerkleTree } from '../lib/merkle.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Load environment ──────────────────────────────────────────────────
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

const RPC_URL = process.env.STARKNET_RPC_URL || 'http://127.0.0.1:5050';
const PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY;
const ACCOUNT_ADDRESS = process.env.STARKNET_ACCOUNT_ADDRESS;

if (!PRIVATE_KEY || !ACCOUNT_ADDRESS) {
  console.error('❌ Missing STARKNET_PRIVATE_KEY or STARKNET_ACCOUNT_ADDRESS in .env');
  process.exit(1);
}

/**
 * Convert a 0x-prefixed keccak256 leaf (bytes32, 256-bit) to a felt252
 * by taking the lower 252 bits. This is safe for nullifier uniqueness.
 */
function leafToFelt(leafHex) {
  const bigVal = BigInt(leafHex);
  const FELT_MAX = (1n << 252n) - 1n;
  return '0x' + (bigVal & FELT_MAX).toString(16);
}

async function main() {
  // ── Sample attested balances (replace with real Layer 2 output) ──
  const attestedBalances = [
    { user_id: 'alice', balance: '1000000000000000000' },
    { user_id: 'bob', balance: '2500000000000000000' },
    { user_id: 'carol', balance: '500000000000000000' },
    { user_id: 'dave', balance: '7500000000000000000' },
  ];

  console.log('🌳 Building Merkle tree from', attestedBalances.length, 'accounts...');
  const { merkleRoot, leaves, totalLiabilities } = buildMerkleTree(attestedBalances);
  console.log('   Merkle root:', merkleRoot);
  console.log('   Total liabilities:', totalLiabilities.toString());

  // ── Convert leaves to felt252 for StarkNet ────────────────────────
  const nullifiers = leaves.map(leafToFelt);

  // ── Load deployment info ──────────────────────────────────────────
  const deploymentPath = path.join(ROOT, 'deployments', 'NullifierRegistry.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ Deployment info not found. Run deploy.js first.');
    process.exit(1);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));

  // ── Connect to StarkNet ───────────────────────────────────────────
  console.log('🔗 Connecting to StarkNet RPC:', RPC_URL);
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, ACCOUNT_ADDRESS, PRIVATE_KEY);

  // ── Load contract ABI ─────────────────────────────────────────────
  const sierraPath = path.join(ROOT, deployment.sierraPath);
  const sierra = json.parse(fs.readFileSync(sierraPath, 'utf-8'));
  const contract = new Contract(sierra.abi, deployment.address, account);

  // ── Call commitCycle ──────────────────────────────────────────────
  const merkleRootFelt = leafToFelt(merkleRoot);
  console.log('📤 Submitting commitCycle...');
  console.log('   Nullifiers:', nullifiers.length);
  console.log('   Merkle root (felt):', merkleRootFelt);

  const tx = await contract.invoke('commit_cycle', [nullifiers, merkleRootFelt]);
  console.log('   Transaction hash:', tx.transaction_hash);

  await provider.waitForTransaction(tx.transaction_hash);
  console.log('✅ Cycle committed successfully!');

  // ── Verify on-chain state ─────────────────────────────────────────
  const cycleId = await contract.call('get_cycle_id');
  const count = await contract.call('get_nullifier_count');
  const root = await contract.call('get_merkle_root');

  console.log('\n📊 On-chain state:');
  console.log('   Cycle ID:', cycleId.toString());
  console.log('   Nullifier count:', count.toString());
  console.log('   Merkle root:', root.toString(16));
}

main().catch((err) => {
  console.error('❌ Submission failed:', err);
  process.exit(1);
});
