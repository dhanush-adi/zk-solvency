import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client.js';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { getEnv } from '../config/env.js';
import { getContract } from './chainService.js';
import Pino from 'pino';

const logger = Pino({ name: 'nullifier-service' });

export interface NullifierData {
  hash: string;
  accountId: string;
  roundId: string;
}

export class NullifierError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'NullifierError';
  }
}

function hashData(data: string): string {
  const hash = createHash('sha256');
  hash.update(data);
  return '0x' + hash.digest('hex');
}

export function generateNullifier(accountId: string, roundId: string): string {
  return hashData(`${accountId}:${roundId}`);
}

export async function registerNullifiers(
  nullifiers: NullifierData[]
): Promise<{ registered: string[]; failed: string[] }> {
  const db = getDb();
  const env = getEnv();
  
  const registered: string[] = [];
  const failed: string[] = [];
  
  for (const nullifier of nullifiers) {
    try {
      const existing = await db.query.nullifiers.findFirst({
        where: eq(schema.nullifiers.nullifierHash, nullifier.hash),
      }) as any;
      
      if (existing) {
        logger.warn({ hash: nullifier.hash }, 'Nullifier already registered');
        continue;
      }
      
      await db.insert(schema.nullifiers).values({
        id: uuidv4(),
        nullifierHash: nullifier.hash,
        accountId: nullifier.accountId,
        roundId: nullifier.roundId,
        onChainConfirmed: '0',
      });
      
      logger.info({ accountId: nullifier.accountId }, 'Nullifier registered locally');
      registered.push(nullifier.hash);
    } catch (err) {
      logger.error({ err, accountId: nullifier.accountId }, 'Failed to register nullifier');
      failed.push(nullifier.hash);
    }
  }
  
  if (env.NULLIFIER_REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000001') {
    try {
      getContract('NullifierRegistry', env.NULLIFIER_REGISTRY_ADDRESS);
      logger.info({ count: registered.length }, 'Submitting nullifiers to chain');
    } catch (err) {
      logger.warn({ err }, 'Could not submit to chain, storing locally only');
    }
  }
  
  return { registered, failed };
}

export async function checkNullifier(hash: string): Promise<boolean> {
  const db = getDb();
  
  const nullifier = await db.query.nullifiers.findFirst({
    where: eq(schema.nullifiers.nullifierHash, hash),
  }) as any;
  
  return nullifier !== null && nullifier.onChainConfirmed === '1';
}

export async function getNullifiersForRound(roundId: string): Promise<string[]> {
  const db = getDb();
  
  const nullifiers = await db.query.nullifiers.findMany({
    where: eq(schema.nullifiers.roundId, roundId),
  }) as any[];
  
  return nullifiers.map((n: any) => n.nullifierHash);
}

export async function confirmNullifierOnChain(
  nullifierHash: string,
  txHash: string
): Promise<void> {
  const db = getDb();
  
  const nullifier = await db.query.nullifiers.findFirst({
    where: eq(schema.nullifiers.nullifierHash, nullifierHash),
  }) as any;
  
  if (!nullifier) {
    throw new NullifierError('Nullifier not found', 'NOT_FOUND');
  }
  
  await db.update(schema.nullifiers)
    .set({
      onChainConfirmed: '1',
      txHash,
      confirmedAt: new Date(),
    })
    .where(eq(schema.nullifiers.id, nullifier.id));
  
  logger.info({ hash: nullifierHash, tx: txHash }, 'Nullifier confirmed on chain');
}

export async function hasDuplicateNullifier(
  accountId: string,
  _roundId: string
): Promise<boolean> {
  const db = getDb();
  
  const existing = await db.query.nullifiers.findFirst({
    where: eq(schema.nullifiers.accountId, accountId),
  }) as any;
  
  return existing !== null;
}