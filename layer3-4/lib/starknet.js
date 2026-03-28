/**
 * starknet.js — Shared StarkNet Provider and Contract Loader
 *
 * Single source of truth for all RPC calls and contract interactions
 * using starknet.js v6+.
 */

import { RpcProvider, Contract } from 'starknet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Singleton Provider ──────────────────────────────────────────────
let provider = null;

/**
 * Returns a singleton RpcProvider.
 * Uses STARKNET_RPC_URL from env (default: Katana local node).
 *
 * @returns {RpcProvider}
 */
export function getProvider() {
  if (provider) return provider;

  const nodeUrl = process.env.STARKNET_RPC_URL || 'http://127.0.0.1:5050';
  provider = new RpcProvider({ nodeUrl });
  return provider;
}

// ── Memoized Contracts ──────────────────────────────────────────────
const contracts = {};

/**
 * Loads a contract from a deployment artifact.
 *
 * @param {string} name - Deployment name (e.g., 'ProofRegistry')
 * @returns {Contract}
 */
function loadContract(name) {
  if (contracts[name]) return contracts[name];

  const deploymentPath = path.join(ROOT, 'deployments', `${name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment artifact for ${name} not found at ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  
  // ABI is included in the Sierra class artifact linked in deployments
  const sierraPath = path.join(ROOT, deployment.sierraPath);
  if (!fs.existsSync(sierraPath)) {
    throw new Error(`Sierra artifact for ${name} not found at ${sierraPath}`);
  }
  
  const sierra = JSON.parse(fs.readFileSync(sierraPath, 'utf-8'));
  const p = getProvider();
  
  contracts[name] = new Contract(sierra.abi, deployment.address, p);
  return contracts[name];
}

export function getProofRegistry() {
  return loadContract('ProofRegistry');
}

export function getNullifierRegistry() {
  return loadContract('NullifierRegistry');
}

/**
 * Thin wrapper around contract.call with helpers.
 *
 * @param {Contract} contract
 * @param {string} method
 * @param {any[]} calldata
 * @returns {Promise<any>}
 */
export async function callContract(contract, method, calldata = []) {
  try {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] Calling ${method} on contract at ${contract.address}`);
    }

    // Retries once on typical RPC timeout/errors
    const execCall = () => contract.call(method, calldata);
    
    try {
      return await execCall();
    } catch (err) {
      console.warn(`[WARN] RPC call failed relative to ${method}, retrying once...`);
      return await execCall();
    }
  } catch (err) {
    console.error(`[ERROR] Contract call ${method} failed:`, err.message);
    throw err;
  }
}
