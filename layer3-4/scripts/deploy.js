/**
 * deploy.js — Deploy NullifierRegistry using Account
 */

import { RpcProvider, Account, json, hash, num } from 'starknet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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
  
  const provider = new RpcProvider({ 
    nodeUrl: RPC_URL,
    blockIdentifier: 'latest'
  });

  console.log('👤 Deployer account:', ACCOUNT_ADDRESS);

  const account = new Account(provider, ACCOUNT_ADDRESS, PRIVATE_KEY);

  const sierraPath = path.join(
    ROOT,
    'cairo/target/dev/zk_solvency_layer4_NullifierRegistry.contract_class.json'
  );
  const casmPath = path.join(
    ROOT,
    'cairo/target/dev/zk_solvency_layer4_NullifierRegistry.compiled_contract_class.json'
  );

  if (!fs.existsSync(sierraPath) || !fs.existsSync(casmPath)) {
    console.error('❌ Compiled artifacts not found.');
    process.exit(1);
  }

  const sierra = json.parse(fs.readFileSync(sierraPath, 'utf-8'));
  const casm = json.parse(fs.readFileSync(casmPath, 'utf-8'));

  console.log('📜 Declaring contract...');

  try {
    // Use declare without fee estimation
    const declareResponse = await account.declare(
      { contract: sierra, casm },
      { 
        maxFee: '0x100000000',
        nonce: '0x0'
      }
    );
    
    console.log('   Class hash:', declareResponse.class_hash);
    console.log('   Tx:', declareResponse.transaction_hash);
    await provider.waitForTransaction(declareResponse.transaction_hash);
    
    console.log('🚀 Deploying NullifierRegistry...');
    
    const deployResponse = await account.deploy(
      { 
        classHash: declareResponse.class_hash, 
        constructorCalldata: [ACCOUNT_ADDRESS] 
      },
      { maxFee: '0x100000000' }
    );
    
    await provider.waitForTransaction(deployResponse.transaction_hash);
    
    const contractAddress = deployResponse.contract_address;
    console.log('✅ NullifierRegistry deployed at:', contractAddress);
    
    const deploymentsDir = path.join(ROOT, 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(deploymentsDir, 'NullifierRegistry.json'),
      JSON.stringify({ 
        contractName: 'NullifierRegistry',
        address: contractAddress, 
        classHash: declareResponse.class_hash,
        deployer: ACCOUNT_ADDRESS,
        network: RPC_URL,
        deployedAt: new Date().toISOString()
      }, null, 2)
    );
    
    console.log('💾 Deployment info saved');
    
  } catch (err) {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
  }
}

main().catch(console.error);
