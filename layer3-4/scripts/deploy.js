/**
 * deploy.js — Deploy NullifierRegistry to StarkNet
 *
 * Usage:
 *   node scripts/deploy.js
 *
 * Requires:
 *   - STARKNET_RPC_URL in .env (defaults to local devnet)
 *   - STARKNET_PRIVATE_KEY in .env
 *   - STARKNET_ACCOUNT_ADDRESS in .env
 *   - Compiled Sierra + CASM artifacts in cairo/target/
 *
 * Outputs:
 *   - deployments/NullifierRegistry.json with address + class hash
 */

import { RpcProvider, Account, json, Contract } from 'starknet';
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

async function main() {
  console.log('🔗 Connecting to StarkNet RPC:', RPC_URL);
  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  const account = new Account(provider, ACCOUNT_ADDRESS, PRIVATE_KEY);
  console.log('👤 Deployer account:', ACCOUNT_ADDRESS);

  // ── Load compiled artifacts ───────────────────────────────────────
  const sierraPath = path.join(
    ROOT,
    'cairo/target/dev/zk_solvency_layer4_NullifierRegistry.contract_class.json'
  );
  const casmPath = path.join(
    ROOT,
    'cairo/target/dev/zk_solvency_layer4_NullifierRegistry.compiled_contract_class.json'
  );

  if (!fs.existsSync(sierraPath) || !fs.existsSync(casmPath)) {
    console.error('❌ Compiled artifacts not found. Run `scarb build` in cairo/ first.');
    process.exit(1);
  }

  const sierra = json.parse(fs.readFileSync(sierraPath, 'utf-8'));
  const casm = json.parse(fs.readFileSync(casmPath, 'utf-8'));

  // ── Declare contract class ────────────────────────────────────────
  console.log('📜 Declaring contract class...');
  const declareResponse = await account.declare({ contract: sierra, casm }, { blockIdentifier: 'latest' });
  console.log('   Class hash:', declareResponse.class_hash);
  await provider.waitForTransaction(declareResponse.transaction_hash);

  // ── Deploy contract instance ──────────────────────────────────────
  console.log('🚀 Deploying NullifierRegistry...');
  const deployResponse = await account.deployContract({
    classHash: declareResponse.class_hash,
    constructorCalldata: [ACCOUNT_ADDRESS], // owner = deployer
  });
  await provider.waitForTransaction(deployResponse.transaction_hash);

  const contractAddress = deployResponse.contract_address;
  console.log('✅ NullifierRegistry deployed at:', contractAddress);

  // ── Save deployment info ──────────────────────────────────────────
  const deploymentsDir = path.join(ROOT, 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    contractName: 'NullifierRegistry',
    address: contractAddress,
    classHash: declareResponse.class_hash,
    deployer: ACCOUNT_ADDRESS,
    network: RPC_URL,
    deployedAt: new Date().toISOString(),
    sierraPath: 'cairo/target/dev/zk_solvency_layer4_NullifierRegistry.contract_class.json',
  };

  const outPath = path.join(deploymentsDir, 'NullifierRegistry.json');
  fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('💾 Deployment info saved to:', outPath);
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
