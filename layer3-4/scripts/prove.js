/**
 * prove.js — Layer 5 Proof Orchestrator Script
 *
 * Flow:
 *   1. Load attestedBalances from Layer 2 output (JSON file or stdin)
 *   2. Load totalAssets from exchange backend (or CLI arg)
 *   3. Call generateProof(attestedBalances, totalAssets)
 *   4. Write proof artifact to /proofs/{cycleId}.json
 *   5. Optionally call submitProof.js to push on-chain
 *
 * Usage:
 *   node scripts/prove.js [--balances path/to/balances.json] [--assets 1000000]
 *   MOCK_PROVER=true node scripts/prove.js
 */

import { generateProof } from '../lib/prover/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Parse CLI args ──────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--balances' && args[i + 1]) opts.balancesPath = args[++i];
    if (args[i] === '--assets' && args[i + 1]) opts.totalAssets = args[++i];
    if (args[i] === '--submit') opts.submit = true;
  }
  return opts;
}

// ── Default sample balances (for demo/testing) ──────────────────────────
const SAMPLE_BALANCES = [
  { user_id: 'alice', balance: '1000000000000000000' },
  { user_id: 'bob', balance: '2500000000000000000' },
  { user_id: 'carol', balance: '500000000000000000' },
  { user_id: 'dave', balance: '7500000000000000000' },
];

async function main() {
  const opts = parseArgs();

  // ── 1. Load attested balances ───────────────────────────────────────
  let attestedBalances;
  if (opts.balancesPath) {
    const raw = fs.readFileSync(opts.balancesPath, 'utf-8');
    attestedBalances = JSON.parse(raw);
    console.log(`📋 Loaded ${attestedBalances.length} balances from ${opts.balancesPath}`);
  } else {
    attestedBalances = SAMPLE_BALANCES;
    console.log(`📋 Using ${attestedBalances.length} sample balances (pass --balances for real data)`);
  }

  // ── 2. Total assets ────────────────────────────────────────────────
  const totalLiabilities = attestedBalances.reduce((sum, e) => sum + BigInt(e.balance), 0n);
  const totalAssets = opts.totalAssets
    ? BigInt(opts.totalAssets)
    : totalLiabilities + 1000000000000000000n; // default: liabilities + buffer
  console.log(`💰 Total assets: ${totalAssets}`);
  console.log(`💳 Total liabilities: ${totalLiabilities}`);

  // ── 3. Generate proof ──────────────────────────────────────────────
  const registryState = process.env.MOCK_PROVER === 'true'
    ? {
        cycleId: process.env.MOCK_CYCLE_ID || '1',
        nullifierCount: String(attestedBalances.length),
        merkleRoot: 'mock',
      }
    : undefined;

  const result = await generateProof(attestedBalances, totalAssets, {
    registryState,
  });

  // ── 4. Write proof artifact ────────────────────────────────────────
  const cycleId = result.publicInputs.cycleId || '1';
  const proofsDir = path.join(ROOT, 'proofs');
  if (!fs.existsSync(proofsDir)) {
    fs.mkdirSync(proofsDir, { recursive: true });
  }

  const artifact = {
    cycleId,
    timestamp: new Date().toISOString(),
    merkleRoot: result.publicInputs.merkleRoot,
    totalAssets: result.publicInputs.totalAssets,
    totalLiabilities: result.publicInputs.totalLiabilities,
    nullifierCount: result.publicInputs.nullifierCount,
    proof: result.proof,
    publicInputs: result.publicInputs,
    proverAdapter: process.env.PROVER_ADAPTER || 'sp1',
    verified: result.verified,
  };

  const artifactPath = path.join(proofsDir, `${cycleId}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`💾 Proof artifact written to: ${artifactPath}`);

  // ── 5. Optionally submit on-chain ─────────────────────────────────
  if (opts.submit) {
    console.log('📤 Submitting proof on-chain...');
    const { execSync } = await import('child_process');
    execSync(`node scripts/submitProof.js --cycle ${cycleId}`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  }

  console.log('✅ Proof generation complete');
}

main().catch((err) => {
  console.error('❌ Proof generation failed:', err.message);
  process.exit(1);
});
