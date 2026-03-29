/**
 * deploy-all.js — Deploy full ZK-Solvency stack to StarkNet
 *
 * Order of deployment:
 * 1. SolvencyVerifier
 * 2. NullifierRegistry
 * 3. ProofRegistry (requires addresses of 1 and 2)
 */

import { RpcProvider, Account, json, hash, cairo } from 'starknet';
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

// ── Pre-flight: verify account has funds on this network ──────────────
async function preflight(provider, accountAddress) {
  console.log('\n🔍 Running pre-flight checks...');

  const specVersion = await provider.getSpecVersion();
  console.log(`   RPC Spec Version: ${specVersion}`);

  try {
    const nonce = await provider.getNonceForAddress(accountAddress);
    console.log(`   Account nonce: ${nonce} ✓`);
  } catch (err) {
    console.error(`   ❌ Account not found or not deployed on this network.`);
    console.error(`   Address: ${accountAddress}`);
    console.error(`   Make sure this account exists on the target network.`);
    throw new Error(`Account pre-flight failed: ${err.message}`);
  }

  // Check ETH balance
  try {
    const ETH_TOKEN = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
    const result = await provider.callContract({
      contractAddress: ETH_TOKEN,
      entrypoint: 'balanceOf',
      calldata: [accountAddress],
    });
    const balanceWei = BigInt(result[0]);
    const balanceEth = Number(balanceWei) / 1e18;
    console.log(`   ETH Balance: ${balanceEth.toFixed(6)} ETH`);
    if (balanceWei === 0n) {
      console.warn('   ⚠️  Zero ETH balance — transaction fees will fail.');
    }
  } catch (_) {
    console.warn('   ⚠️  Could not check ETH balance.');
  }

  console.log('   Pre-flight done.\n');
}

async function deployContract(account, provider, name, constructorArgs = []) {
  console.log(`\n📦 Preparing deployment for: ${name}`);

  const sierraPath = path.join(ROOT, `cairo/target/dev/zk_solvency_layer4_${name}.contract_class.json`);
  const casmPath = path.join(ROOT, `cairo/target/dev/zk_solvency_layer4_${name}.compiled_contract_class.json`);

  if (!fs.existsSync(sierraPath) || !fs.existsSync(casmPath)) {
    throw new Error(`Artifacts for ${name} not found. Run: cd cairo && scarb build`);
  }

  console.log(`   Parsing Sierra & CASM (may take a few seconds for large contracts)...`);
  const sierra = json.parse(fs.readFileSync(sierraPath, 'utf-8'));
  const casm = json.parse(fs.readFileSync(casmPath, 'utf-8'));

  // Pre-compute class hash to give user feedback before the RPC call
  console.log(`   Computing class hash...`);
  const classHash = hash.computeContractClassHash(sierra);
  console.log(`   Expected class hash: ${classHash}`);

  // Check if already declared to avoid re-declaring
  try {
    await provider.getClassByHash(classHash);
    console.log(`   ♻️  Class already declared — skipping declare step.`);
  } catch (_) {
    console.log(`📜 Declaring ${name} on-chain...`);
    const declareResponse = await account.declare({ contract: sierra, casm });
    console.log(`   Declare tx: ${declareResponse.transaction_hash}`);
    console.log(`   Waiting for declare to be accepted...`);
    await provider.waitForTransaction(declareResponse.transaction_hash, { retryInterval: 3000 });
    console.log(`   ✅ Declared! Class hash: ${declareResponse.class_hash}`);
  }

  console.log(`🚀 Deploying instance of ${name}...`);
  const deployResponse = await account.deployContract({
    classHash,
    constructorCalldata: constructorArgs,
  });
  console.log(`   Deploy tx: ${deployResponse.transaction_address || deployResponse.transaction_hash}`);
  console.log(`   Waiting for deployment to be accepted...`);
  await provider.waitForTransaction(deployResponse.transaction_hash, { retryInterval: 3000 });

  const address = deployResponse.contract_address;
  console.log(`   ✅ ${name} deployed at: ${address}`);
  return { address, classHash };
}

// ── Update .env file helper ───────────────────────────────────────────
function updateEnvFile(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    console.warn(`   ⚠️  .env not found at ${filePath}, skipping.`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  fs.writeFileSync(filePath, content);
  console.log(`   Updated: ${filePath}`);
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   ZK-SOLVENCY STARKNET DEPLOYMENT 🚀   ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n🔗 Network: ${RPC_URL}`);
  console.log(`👤 Deployer: ${ACCOUNT_ADDRESS}`);

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, ACCOUNT_ADDRESS, PRIVATE_KEY);

  // Pre-flight check
  await preflight(provider, ACCOUNT_ADDRESS);

  const deployments = {};

  // 1. Deploy SolvencyVerifier
  const verifier = await deployContract(account, provider, 'SolvencyVerifier', [ACCOUNT_ADDRESS]);
  deployments.SolvencyVerifier = verifier;

  // 2. Deploy NullifierRegistry
  const nullifier = await deployContract(account, provider, 'NullifierRegistry', [ACCOUNT_ADDRESS]);
  deployments.NullifierRegistry = nullifier;

  // 3. Deploy ProofRegistry (requires verifier + nullifier addresses)
  const proofRegistry = await deployContract(account, provider, 'ProofRegistry', [
    ACCOUNT_ADDRESS,
    verifier.address,
    nullifier.address,
  ]);
  deployments.ProofRegistry = proofRegistry;

  // ── Save deployment JSON ──────────────────────────────────────────
  const deploymentsDir = path.join(ROOT, 'deployments');
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const summary = {
    network: RPC_URL,
    deployer: ACCOUNT_ADDRESS,
    timestamp: new Date().toISOString(),
    contracts: deployments,
  };

  const summaryPath = path.join(deploymentsDir, 'all_deployments.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Deployment summary saved to: ${summaryPath}`);

  // ── Auto-update .env files ────────────────────────────────────────
  const envUpdates = {
    NULLIFIER_REGISTRY_ADDRESS: nullifier.address,
    SOLVENCY_VERIFIER_ADDRESS: verifier.address,
    PROOF_REGISTRY_ADDRESS: proofRegistry.address,
  };

  console.log('\n📝 Updating .env files...');
  updateEnvFile(path.join(ROOT, '.env'), envUpdates);
  updateEnvFile(path.join(ROOT, '..', 'backend', '.env'), envUpdates);

  // ── Print summary ──────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║           DEPLOYMENT COMPLETE ✨         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\nNULLIFIER_REGISTRY_ADDRESS=${nullifier.address}`);
  console.log(`SOLVENCY_VERIFIER_ADDRESS=${verifier.address}`);
  console.log(`PROOF_REGISTRY_ADDRESS=${proofRegistry.address}`);
  console.log('\n✅ .env files updated automatically.');
  console.log('▶️  Next: node scripts/seed-data.js');
}

main().catch((err) => {
  console.error('\n❌ DEPLOYMENT FAILED:', err.message || err);
  process.exit(1);
});
