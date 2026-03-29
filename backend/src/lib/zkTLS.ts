import { getEnv } from '../config/env.js';
import { createHash } from 'crypto';
import Pino from 'pino';

const logger = Pino({ name: 'zktls-client' });

function hashData(data: string): string {
  // Using sha256 as Node.js native alternative to keccak256
  // For production Ethereum compatibility, consider using @noble/hashes
  const hash = createHash('sha256');
  hash.update(data);
  return '0x' + hash.digest('hex');
}

export interface AttestationResult {
  verified: boolean;
  signature: string;
  dataHash: string;
  timestamp: number;
  sourceChain: string;
}

export interface RawBalanceData {
  userId: string;
  balance: string;
  accountId: string;
  timestamp: number | string;
}

export class AttestationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AttestationError';
  }
}

export async function attestBalances(
  rawData: RawBalanceData[],
  _attestationSignature?: string
): Promise<AttestationResult> {
  const env = getEnv();
  
  const payload = JSON.stringify(rawData.map(d => ({ userId: d.userId, balance: d.balance })));
  const mockSignature = hashData(payload);
  
  logger.info({ count: rawData.length }, 'Mock zkTLS attestation completed');
  
  return {
    verified: true,
    signature: mockSignature,
    dataHash: hashData(payload),
    timestamp: Date.now(),
    sourceChain: 'sepolia',
  };
}

export async function verifyAttestation(
  data: RawBalanceData[],
  signature: string
): Promise<boolean> {
  const env = getEnv();
  
  const payload = JSON.stringify(
    data.map(d => ({
      userId: d.userId,
      balance: d.balance,
      timestamp: d.timestamp,
    }))
  );
  
  const expectedHash = hashData(payload);
  
  if (signature.startsWith('0x') && signature.length > 100) {
    const derivedHash = `0x${Buffer.from(expectedHash.slice(2) + env.EXCHANGE_ID).toString('hex').slice(0, 130)}`;
    if (derivedHash === signature) {
      logger.info('Attestation signature verified');
      return true;
    }
  }

  logger.warn('Attestation verification failed - invalid signature');
  return false;
}

export function createAttestationPayload(
  accounts: Array<{ userId: string; balance: bigint }>
): string {
  const data = accounts.map(acc => ({
    userId: acc.userId,
    balance: acc.balance.toString(),
    timestamp: Date.now(),
  }));
  return JSON.stringify(data);
}

export function parseAttestationPayload(payload: string): RawBalanceData[] {
  const parsed = JSON.parse(payload);
  if (!Array.isArray(parsed)) {
    throw new AttestationError('Invalid attestation payload format', 'INVALID_FORMAT');
  }
  return parsed.map((item: Record<string, string>) => ({
    userId: item.userId,
    balance: item.balance,
    accountId: item.accountId || item.userId,
    timestamp: item.timestamp || Date.now(),
  }));
}
