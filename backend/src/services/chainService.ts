import { RpcProvider, Account, Contract, json as starknetJson } from 'starknet';
import { getEnv } from '../config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Pino from 'pino';

const logger = Pino({ name: 'chain-service' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Sierra ABI paths (relative to project root) ─────────────────────────
const SIERRA_PATHS: Record<string, string> = {
  NullifierRegistry:
    '../layer3-4/cairo/target/dev/zk_solvency_layer4_NullifierRegistry.contract_class.json',
  SolvencyVerifier:
    '../layer3-4/cairo/target/dev/zk_solvency_layer4_SolvencyVerifier.contract_class.json',
  ProofRegistry:
    '../layer3-4/cairo/target/dev/zk_solvency_layer4_ProofRegistry.contract_class.json',
};

let provider: RpcProvider | null = null;
let account: Account | null = null;
const contractCache = new Map<string, Contract>();
const abiCache = new Map<string, any>();

// ── Provider + Account ──────────────────────────────────────────────────

export function getProvider(): RpcProvider {
  if (provider) return provider;
  const env = getEnv();
  provider = new RpcProvider({ nodeUrl: env.STARKNET_RPC_URL });
  return provider;
}

export function getAccount(): Account {
  if (account) return account;
  const env = getEnv();
  if (!env.STARKNET_PRIVATE_KEY || !env.STARKNET_ACCOUNT_ADDRESS) {
    throw new Error('STARKNET_PRIVATE_KEY and STARKNET_ACCOUNT_ADDRESS required');
  }
  const prov = getProvider();
  account = new Account(prov, env.STARKNET_ACCOUNT_ADDRESS, env.STARKNET_PRIVATE_KEY);
  return account;
}

// ── ABI Loader ──────────────────────────────────────────────────────────

function loadAbi(contractName: string): any[] {
  if (abiCache.has(contractName)) {
    return abiCache.get(contractName)!;
  }

  const relativePath = SIERRA_PATHS[contractName];
  if (!relativePath) {
    throw new Error(`Unknown contract: ${contractName}`);
  }

  const fullPath = path.resolve(__dirname, '..', '..', relativePath);
  if (!fs.existsSync(fullPath)) {
    logger.warn({ contractName, fullPath }, 'Sierra ABI not found, using minimal ABI');
    return [];
  }

  const sierra = starknetJson.parse(fs.readFileSync(fullPath, 'utf-8'));
  abiCache.set(contractName, sierra.abi);
  return sierra.abi;
}

// ── Contract Loader ─────────────────────────────────────────────────────

export function getContract(name: string, address: string): Contract {
  const cacheKey = `${name}-${address}`;
  if (contractCache.has(cacheKey)) {
    return contractCache.get(cacheKey)!;
  }

  const abi = loadAbi(name);
  const acc = getAccount();
  const contract = new Contract(abi, address, acc);
  contractCache.set(cacheKey, contract);

  logger.info({ name, address }, 'StarkNet contract loaded');
  return contract;
}

// ── Layer 6: ProofRegistry interactions ─────────────────────────────────

export async function submitProofToChain(
  cycleId: bigint,
  merkleRoot: string,
  totalAssets: bigint,
  totalLiabilities: bigint,
  nullifierCount: bigint,
  proofData: string[],
): Promise<string> {
  const env = getEnv();

  try {
    const contract = getContract('ProofRegistry', env.PROOF_REGISTRY_ADDRESS);

    const tx = await contract.invoke('submit_proof', [
      cycleId,
      merkleRoot,
      { low: totalAssets & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: totalAssets >> 128n },
      { low: totalLiabilities & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: totalLiabilities >> 128n },
      nullifierCount,
      proofData,
    ]);

    const prov = getProvider();
    await prov.waitForTransaction(tx.transaction_hash);
    logger.info({ txHash: tx.transaction_hash, cycleId: cycleId.toString() }, 'Proof submitted to chain');

    return tx.transaction_hash;
  } catch (err) {
    logger.error({ err }, 'Failed to submit proof to chain');
    throw err;
  }
}

export async function getLatestProof(): Promise<{
  cycleId: bigint;
  merkleRoot: string;
  totalAssets: bigint;
  totalLiabilities: bigint;
  nullifierCount: bigint;
  timestamp: number;
  verified: boolean;
} | null> {
  const env = getEnv();

  try {
    const contract = getContract('ProofRegistry', env.PROOF_REGISTRY_ADDRESS);
    const latestCycleId: any = await contract.call('get_latest_cycle_id');

    if (BigInt(latestCycleId) === 0n) {
      return null;
    }

    const result: any = await contract.call('get_proof', [latestCycleId]);

    return {
      cycleId: BigInt(result[0]),
      merkleRoot: '0x' + BigInt(result[1]).toString(16),
      totalAssets: BigInt(result[2]),
      totalLiabilities: BigInt(result[3]),
      nullifierCount: BigInt(result[4]),
      timestamp: Number(result[5]) * 1000,
      verified: Boolean(result[6]),
    };
  } catch (err) {
    logger.error({ err }, 'Failed to get latest proof');
    return null;
  }
}

export async function isSolvent(): Promise<boolean> {
  const env = getEnv();

  try {
    const contract = getContract('ProofRegistry', env.PROOF_REGISTRY_ADDRESS);
    const result: any = await contract.call('is_solvent');
    return Boolean(result);
  } catch (err) {
    logger.error({ err }, 'Failed to check solvency');
    return false;
  }
}

export async function getCycleId(): Promise<bigint> {
  const env = getEnv();

  try {
    const contract = getContract('ProofRegistry', env.PROOF_REGISTRY_ADDRESS);
    const result: any = await contract.call('get_latest_cycle_id');
    return BigInt(result);
  } catch (err) {
    logger.error({ err }, 'Failed to get cycle ID');
    return 0n;
  }
}

// ── Layer 4: NullifierRegistry interactions ─────────────────────────────

export async function verifyNullifierOnChain(nullifier: string): Promise<boolean> {
  const env = getEnv();

  try {
    const contract = getContract('NullifierRegistry', env.NULLIFIER_REGISTRY_ADDRESS);
    const result: any = await contract.call('is_included', [nullifier]);
    return Boolean(result);
  } catch (err) {
    logger.error({ err, nullifier }, 'Failed to verify nullifier on chain');
    return false;
  }
}

export async function getNullifierRegistryState(): Promise<{
  cycleId: bigint;
  nullifierCount: bigint;
  merkleRoot: string;
}> {
  const env = getEnv();
  const contract = getContract('NullifierRegistry', env.NULLIFIER_REGISTRY_ADDRESS);

  const [cycleId, nullifierCount, merkleRoot]: any[] = await Promise.all([
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

export async function getBlockNumber(): Promise<number> {
  const prov = getProvider();
  const block = await prov.getBlockLatestAccepted();
  return block.block_number;
}
