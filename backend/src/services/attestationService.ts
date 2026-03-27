import { v4 as uuidv4 } from 'uuid';
import { getDb, schema } from '../db/client.js';
import { attestBalances, verifyAttestation, RawBalanceData, AttestationError } from '../lib/zkTLS.js';
import { eq, and } from 'drizzle-orm';
import Pino from 'pino';

const logger = Pino({ name: 'attestation-service' });

export interface AttestedAccount {
  id: string;
  userId: string;
  balance: bigint;
  balanceEncrypted?: string;
  hashedLeaf: string;
}

export async function processAttestation(
  rawData: RawBalanceData[],
  signature: string
): Promise<AttestedAccount[]> {
  const isValid = await verifyAttestation(rawData, signature);
  
  if (!isValid) {
    throw new AttestationError('Invalid attestation signature', 'INVALID_SIGNATURE');
  }
  
  const result = await attestBalances(rawData, signature);
  
  if (!result.verified) {
    throw new AttestationError('Attestation verification failed', 'VERIFICATION_FAILED');
  }
  
  const accounts: AttestedAccount[] = rawData.map(data => {
    const balance = BigInt(data.balance);
    
    return {
      id: uuidv4(),
      userId: data.userId,
      balance,
      balanceEncrypted: undefined,
      hashedLeaf: '0xplaceholder',
    };
  });
  
  logger.info({ accountCount: accounts.length, timestamp: result.timestamp }, 'Attestation processed');
  
  return accounts;
}

export async function saveAttestedAccounts(
  accounts: AttestedAccount[],
  exchangeId: string
): Promise<void> {
  const db = getDb();
  
  for (const account of accounts) {
    const existing = await db.query.accounts.findFirst({
      where: and(
        eq(schema.accounts.userId, account.userId),
        eq(schema.accounts.exchangeId, exchangeId)
      ),
    }) as any;
    
    if (existing) {
      await db.update(schema.accounts)
        .set({
          balance: account.balance.toString(),
          balanceEncrypted: account.balanceEncrypted,
          hashedLeaf: account.hashedLeaf,
          updatedAt: new Date(),
        })
        .where(eq(schema.accounts.id, existing.id));
    } else {
      await db.insert(schema.accounts).values({
        id: account.id,
        exchangeId,
        userId: account.userId,
        balance: account.balance.toString(),
        balanceEncrypted: account.balanceEncrypted,
        hashedLeaf: account.hashedLeaf,
      });
    }
  }
  
  logger.info({ accountCount: accounts.length }, 'Attested accounts saved');
}

export async function getAccountsByExchange(exchangeId: string): Promise<AttestedAccount[]> {
  const db = getDb();
  
  const accounts = await db.query.accounts.findMany({
    where: eq(schema.accounts.exchangeId, exchangeId),
  }) as any[];
  
  return accounts.map((acc: any) => ({
    id: acc.id,
    userId: acc.userId,
    balance: BigInt(acc.balance),
    balanceEncrypted: acc.balanceEncrypted || undefined,
    hashedLeaf: acc.hashedLeaf,
  }));
}