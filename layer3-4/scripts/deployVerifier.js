/**
 * deployVerifier.js — Deploy Layer 6 Contracts to StarkNet
 *
 * Deploy order (dependencies chain down):
 *   1. SolvencyVerifier (IVerifier implementation)
 *   2. ProofRegistry (depends on SolvencyVerifier + NullifierRegistry)
 *
 * Usage:
 *   node scripts/deployVerifier.js
 *
 * Requires:
 *   - deployments/NullifierRegistry.json (from deploy.js)
 *   - Compiled Sierra + CASM artifacts in cairo/target/
 *   - STARKNET_RPC_URL, STARKNET_PRIVATE_KEY, STARKNET_ACCOUNT_ADDRESS in .env
 */

import { RpcProvider, Account, json } from 'starknet';
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

  // ── Load NullifierRegistry deployment ──────────────────────────────
  const nrDeploymentPath = path.join(ROOT, 'deployments', 'NullifierRegistry.json');
  if (!fs.existsSync(nrDeploymentPath)) {
    console.error('❌ NullifierRegistry deployment not found. Run deploy.js first.');
    process.exit(1);
  }
  const nrDeployment = JSON.parse(fs.readFileSync(nrDeploymentPath, 'utf-8'));
  console.log('📋 NullifierRegistry at:', nrDeployment.address);

  // ── Deploy SolvencyVerifier ────────────────────────────────────────
  console.log('\n🔐 Deploying SolvencyVerifier...');
  const verifierAddress = await deployContract(
    account, provider,
    'zk_solvency_layer4_SolvencyVerifier',
    [ACCOUNT_ADDRESS],  // constructor: owner
  );
  console.log('✅ SolvencyVerifier deployed at:', verifierAddress);

  // ── Deploy ProofRegistry ───────────────────────────────────────────
  console.log('\n📦 Deploying ProofRegistry...');
  const registryAddress = await deployContract(
    account, provider,
    'zk_solvency_layer4_ProofRegistry',
    [ACCOUNT_ADDRESS, verifierAddress, nrDeployment.address],  // owner, verifier, nr
  );
  console.log('✅ ProofRegistry deployed at:', registryAddress);

  // ── Save deployment info ───────────────────────────────────────────
  const deploymentsDir = path.join(ROOT, 'deployments');

  saveDeployment(deploymentsDir, 'SolvencyVerifier', {
    contractName: 'SolvencyVerifier',
    address: verifierAddress,
    deployer: ACCOUNT_ADDRESS,
    network: RPC_URL,
    deployedAt: new Date().toISOString(),
    sierraPath: 'cairo/target/dev/zk_solvency_layer4_SolvencyVerifier.contract_class.json',
  });

  saveDeployment(deploymentsDir, 'ProofRegistry', {
    contractName: 'ProofRegistry',
    address: registryAddress,
    deployer: ACCOUNT_ADDRESS,
    network: RPC_URL,
    deployedAt: new Date().toISOString(),
    nullifierRegistry: nrDeployment.address,
    solvencyVerifier: verifierAddress,
    sierraPath: 'cairo/target/dev/zk_solvency_layer4_ProofRegistry.contract_class.json',
  });

  console.log('\n🎉 Layer 6 deployment complete!');
  console.log('   SolvencyVerifier:', verifierAddress);
  console.log('   ProofRegistry:', registryAddress);
}

async function deployContract(account, provider, contractName, constructorArgs) {
  const sierraPath = path.join(ROOT, `cairo/target/dev/${contractName}.contract_class.json`);
  const casmPath = path.join(ROOT, `cairo/target/dev/${contractName}.compiled_contract_class.json`);

  if (!fs.existsSync(sierraPath) || !fs.existsSync(casmPath)) {
    console.error(`❌ Compiled artifacts not found for ${contractName}. Run 'scarb build' first.`);
    process.exit(1);
  }

  const sierra = json.parse(fs.readFileSync(sierraPath, 'utf-8'));
  const casm = json.parse(fs.readFileSync(casmPath, 'utf-8'));

  console.log('   📜 Declaring contract class...');
  const nonce = await account.getNonce('latest');
  const declareResponse = await account.declare(
    { contract: sierra, casm },
    { nonce, version: 2, skipValidate: true }
  );
  console.log('   Class hash:', declareResponse.class_hash);
  await provider.waitForTransaction(declareResponse.transaction_hash);

  console.log('   🚀 Deploying instance...');
  const deployNonce = await account.getNonce('latest');
  const deployResponse = await account.deployContract({
    classHash: declareResponse.class_hash,
    constructorCalldata: constructorArgs,
  }, { nonce: deployNonce, version: 1, skipValidate: true });
  await provider.waitForTransaction(deployResponse.transaction_hash);

  return deployResponse.contract_address;
}

function saveDeployment(dir, name, data) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const outPath = path.join(dir, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`   💾 Saved to: ${outPath}`);
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
