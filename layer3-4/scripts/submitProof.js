/**
 * submitProof.js — Submit Generated Proof On-Chain (Layer 6)
 *
 * Reads /proofs/{cycleId}.json (output from prove.js)
 * Calls ProofRegistry.submit_proof() via starknet.js
 *
 * Usage:
 *   node scripts/submitProof.js --cycle 1
 */

import { RpcProvider, Account, Contract, json, cairo } from 'starknet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function parseArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cycle' && args[i + 1]) return { cycleId: args[++i] };
  }
  console.error('❌ Usage: node scripts/submitProof.js --cycle <cycleId>');
  process.exit(1);
}

async function main() {
  const { cycleId } = parseArgs();

  // ── Load proof artifact ────────────────────────────────────────────
  const proofPath = path.join(ROOT, 'proofs', `${cycleId}.json`);
  if (!fs.existsSync(proofPath)) {
    console.error(`❌ Proof artifact not found: ${proofPath}`);
    console.error('   Run prove.js first.');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(proofPath, 'utf-8'));
  console.log(`📄 Loaded proof artifact for cycle ${cycleId}`);

  // ── Load ProofRegistry deployment ──────────────────────────────────
  const deploymentPath = path.join(ROOT, 'deployments', 'ProofRegistry.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ ProofRegistry deployment not found. Run deployVerifier.js first.');
    process.exit(1);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));

  // ── Connect to StarkNet ────────────────────────────────────────────
  console.log('🔗 Connecting to StarkNet RPC:', RPC_URL);
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, ACCOUNT_ADDRESS, PRIVATE_KEY);

  // ── Load contract ABI ──────────────────────────────────────────────
  const sierraPath = path.join(ROOT, deployment.sierraPath);
  const sierra = json.parse(fs.readFileSync(sierraPath, 'utf-8'));
  const contract = new Contract(sierra.abi, deployment.address, account);

  // ── Submit proof ───────────────────────────────────────────────────
  console.log('📤 Submitting proof to ProofRegistry...');
  console.log('   Cycle ID:', artifact.cycleId);
  console.log('   Merkle Root:', artifact.merkleRoot);
  console.log('   Total Assets:', artifact.totalAssets);
  console.log('   Total Liabilities:', artifact.totalLiabilities);
  console.log('   Nullifier Count:', artifact.nullifierCount);

  // Convert proof to felt252 array
  const proofData = [artifact.proof];

  const tx = await contract.invoke('submit_proof', [
    artifact.cycleId,
    artifact.merkleRoot,
    cairo.uint256(artifact.totalAssets),
    cairo.uint256(artifact.totalLiabilities),
    artifact.nullifierCount,
    proofData,
  ]);

  console.log('   Transaction hash:', tx.transaction_hash);
  await provider.waitForTransaction(tx.transaction_hash);
  console.log('✅ Proof submitted successfully!');

  // ── Verify on-chain state ──────────────────────────────────────────
  const latestCycleId = await contract.call('get_latest_cycle_id');
  const isSolvent = await contract.call('is_solvent');

  console.log('\n📊 On-chain state:');
  console.log('   Latest cycle ID:', latestCycleId.toString());
  console.log('   Is solvent:', isSolvent);
}

main().catch((err) => {
  console.error('❌ Proof submission failed:', err);
  process.exit(1);
});
