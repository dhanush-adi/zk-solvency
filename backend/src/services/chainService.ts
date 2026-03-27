import { ethers, Contract, Wallet } from 'ethers';
import { getEnv } from '../config/env.js';
import Pino from 'pino';

const logger = Pino({ name: 'chain-service' });

const contractAbis: Record<string, string[]> = {
  NullifierRegistry: [
    'function registerNullifiers(bytes32[] calldata nullifiers) external',
    'function isRegistered(bytes32 calldata nullifier) external view returns (bool)',
    'event NullifierRegistered(bytes32 indexed nullifier, address indexed sender)',
  ],
  SolvencyVerifier: [
    'function submitProof(bytes calldata proof, bytes32[] calldata publicInputs) external',
    'function latestProof() external view returns (bytes32 merkleRoot, uint256 totalAssets, uint256 totalLiabilities, uint256 timestamp)',
    'event ProofSubmitted(address indexed prover, bytes32 merkleRoot)',
  ],
  ProofChain: [
    'function appendProof(bytes32 previousRoot, bytes32 newRoot, bytes calldata proof) external',
    'function getRoundHash(uint256 roundNumber) external view returns (bytes32)',
    'function latestRound() external view returns (uint256 roundNumber, bytes32 root, uint256 timestamp)',
    'event ProofAppended(uint256 indexed roundNumber, bytes32 indexed root)',
  ],
};

let provider: ethers.JsonRpcProvider | null = null;
let wallet: Wallet | null = null;
const contractCache = new Map<string, Contract>();

export function getProvider(): ethers.JsonRpcProvider {
  if (provider) {
    return provider;
  }
  
  const env = getEnv();
  provider = new ethers.JsonRpcProvider(env.CHAIN_RPC_URL);
  return provider;
}

export function getWallet(): Wallet {
  if (wallet) {
    return wallet;
  }
  
  const env = getEnv();
  if (!env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not configured');
  }
  
  const prov = getProvider();
  wallet = new Wallet(env.PRIVATE_KEY, prov);
  return wallet;
}

export function getContract(name: string, address: string): Contract {
  const cacheKey = `${name}-${address}`;
  
  if (contractCache.has(cacheKey)) {
    return contractCache.get(cacheKey)!;
  }
  
  const abi = contractAbis[name];
  if (!abi) {
    throw new Error(`Unknown contract: ${name}`);
  }
  
  const w = getWallet();
  const contract = new Contract(address, abi, w);
  contractCache.set(cacheKey, contract);
  
  logger.info({ name, address }, 'Contract loaded');
  return contract;
}

export async function submitProofToChain(
  proof: string,
  merkleRoot: string,
  totalAssets: bigint,
  totalLiabilities: bigint
): Promise<string> {
  const env = getEnv();
  
  try {
    const contract = getContract('SolvencyVerifier', env.VERIFIER_CONTRACT_ADDRESS);
    
    const tx = await contract.submitProof(
      proof,
      [merkleRoot, `0x${totalAssets.toString(16)}`, `0x${totalLiabilities.toString(16)}`]
    );
    
    const receipt = await tx.wait();
    logger.info({ txHash: receipt.hash }, 'Proof submitted to chain');
    
    return receipt.hash;
  } catch (err) {
    logger.error({ err }, 'Failed to submit proof to chain');
    throw err;
  }
}

export async function appendToProofChain(
  previousRoot: string,
  newRoot: string,
  proof: string
): Promise<string> {
  const env = getEnv();
  
  try {
    const contract = getContract('ProofChain', env.PROOF_CHAIN_ADDRESS);
    
    const tx = await contract.appendProof(previousRoot, newRoot, proof);
    const receipt = await tx.wait();
    
    logger.info({ txHash: receipt.hash }, 'Proof appended to chain');
    return receipt.hash;
  } catch (err) {
    logger.error({ err }, 'Failed to append proof to chain');
    throw err;
  }
}

export async function getLatestProof(): Promise<{
  merkleRoot: string;
  totalAssets: bigint;
  totalLiabilities: bigint;
  timestamp: number;
} | null> {
  const env = getEnv();
  
  try {
    const contract = getContract('SolvencyVerifier', env.VERIFIER_CONTRACT_ADDRESS);
    const result = await contract.latestProof();
    
    if (!result || result.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null;
    }
    
    return {
      merkleRoot: result.merkleRoot,
      totalAssets: result.totalAssets,
      totalLiabilities: result.totalLiabilities,
      timestamp: Number(result.timestamp) * 1000,
    };
  } catch (err) {
    logger.error({ err }, 'Failed to get latest proof');
    return null;
  }
}

export async function verifyNullifierOnChain(nullifier: string): Promise<boolean> {
  const env = getEnv();
  
  try {
    const contract = getContract('NullifierRegistry', env.NULLIFIER_REGISTRY_ADDRESS);
    return await contract.isRegistered(nullifier);
  } catch (err) {
    logger.error({ err, nullifier }, 'Failed to verify nullifier on chain');
    return false;
  }
}

export async function getBlockNumber(): Promise<number> {
  const prov = getProvider();
  return prov.getBlockNumber();
}
