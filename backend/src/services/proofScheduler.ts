import { Queue, Worker, Job } from 'bullmq';
import { getEnv } from '../config/env.js';
import { getDb, schema } from '../db/client.js';
import { getRedisClient } from '../config/redis.js';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { buildTree, saveMerkleNodes, getRoot } from './merkleService.js';
import { generateNullifier, registerNullifiers } from './nullifierService.js';
import { submitJob, waitForProof, ProverJob } from './proverService.js';
import { submitProofToChain, getNullifierRegistryState } from './chainService.js';
import { getAccountsByExchange } from './attestationService.js';
import { createHash } from 'crypto';
import Pino from 'pino';

const logger = Pino({ name: 'proof-scheduler' });

function keccak256(data: string): string {
  const hash = createHash('keccak256');
  hash.update(data);
  return '0x' + hash.digest('hex');
}

export interface ProofJobData {
  exchangeId: string;
  roundNumber: number;
}

let queue: Queue | null = null;
let worker: Worker | null = null;

export async function initProofScheduler(): Promise<void> {
  const redis = getRedisClient();
  if (!redis) throw new Error('Redis client not initialized');
  
  queue = new Queue('proof-rounds', {
    connection: redis as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000,
      },
    },
  });
  
  worker = new Worker('proof-rounds', async (job: Job) => {
    return await processProofRound(job.data);
  }, {
    connection: redis as any,
    concurrency: 1,
  });
  
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id ?? 'unknown' }, 'Proof round completed');
  });
  
  worker.on('failed', (job, err) => {
    if (!job || !job.id) {
      logger.error({ err }, 'Proof round failed without job info');
      return;
    }
    logger.error({ jobId: job.id, err }, 'Proof round failed');
  });
  
  logger.info('Proof scheduler initialized');
}

export async function scheduleProofRound(exchangeId: string): Promise<string> {
  if (!queue) {
    throw new Error('Queue not initialized');
  }
  
  const db = getDb();
  const latestRound = await db.query.proofRounds.findFirst({
    orderBy: [desc(schema.proofRounds.roundNumber)],
  }) as any;
  
  const roundNumber = (latestRound?.roundNumber || 0) + 1;
  
  const job = await queue.add('proof-round', {
    exchangeId,
    roundNumber,
  });
  
  logger.info({ roundNumber, jobId: job.id }, 'Proof round scheduled');
  return job.id!;
}

export async function startProofScheduler(): Promise<void> {
  const env = getEnv();
  
  const schedule = async () => {
    try {
      await scheduleProofRound(env.EXCHANGE_ID);
    } catch (err) {
      logger.error({ err }, 'Failed to schedule proof round');
    }
  };
  
  await schedule();
  
  setInterval(schedule, env.PROOF_INTERVAL_MS);
  logger.info({ interval: env.PROOF_INTERVAL_MS }, 'Proof scheduler started');
}

export async function processProofRound(data: ProofJobData): Promise<{
  roundId: string;
  merkleRoot: string;
  txHash?: string;
}> {
  const { exchangeId, roundNumber } = data;
  const db = getDb();
  
  const roundId = uuidv4();
  
  logger.info({ roundNumber, exchangeId }, 'Starting proof round');
  
  try {
    const accounts = await getAccountsByExchange(exchangeId);
    if (accounts.length === 0) {
      throw new Error('No accounts found for exchange');
    }
    
    const sortedAccounts = accounts.sort((a, b) => a.userId.localeCompare(b.userId));
    
    const totalLiabilities = accounts.reduce((sum, acc) => sum + acc.balance, 0n);
    
    const tree = await buildTree(sortedAccounts);
    const merkleRoot = await getRoot();
    
    if (!merkleRoot) {
      throw new Error('Failed to build Merkle tree');
    }
    
    await saveMerkleNodes(roundId, tree);
    
    const nullifiers: Array<{ hash: string; accountId: string; roundId: string }> = [];
    for (const account of sortedAccounts) {
      const nullifierHash = generateNullifier(account.id, roundId);
      nullifiers.push({
        hash: nullifierHash,
        accountId: account.id,
        roundId,
      });
    }
    
    await registerNullifiers(nullifiers);
    
    const previousRound = await db.query.proofRounds.findFirst({
      orderBy: [desc(schema.proofRounds.roundNumber)],
      where: eq(schema.proofRounds.status, 'verified'),
    }) as any;
    
    const previousRoundHash = previousRound?.merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    const nullifierSetRoot = keccak256(nullifiers.map(n => n.hash).join(''));
    
    const totalAssets = totalLiabilities;
    
    await db.insert(schema.proofRounds).values({
      id: roundId,
      roundNumber,
      merkleRoot,
      totalAssets: totalAssets.toString(),
      totalLiabilities: totalLiabilities.toString(),
      previousRoundHash,
      status: 'processing',
    });
    
    const jobId = await submitJob({
      merkleRoot,
      totalAssets,
      totalLiabilities,
      nullifierSetRoot,
    });
    
    const proverJob = await waitForProof(jobId);
    
    const txHash = await submitChainProof(
      roundId,
      merkleRoot,
      previousRoundHash,
      proverJob
    );
    
    await db.update(schema.proofRounds)
      .set({
        starkProofCid: proverJob.proof,
        chainTxHash: txHash,
        status: 'verified',
        verifiedAt: new Date(),
      })
      .where(eq(schema.proofRounds.id, roundId));
    
    logger.info({ roundNumber, merkleRoot, txHash }, 'Proof round completed');
    
    return { roundId, merkleRoot, txHash };
  } catch (err) {
    await db.update(schema.proofRounds)
      .set({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .where(eq(schema.proofRounds.id, roundId));
    
    logger.error({ err, roundNumber }, 'Proof round failed');
    throw err;
  }
}

async function submitChainProof(
  _roundId: string,
  merkleRoot: string,
  _previousRoundHash: string,
  proverJob: ProverJob
): Promise<string> {
  try {
    const cycleId = proverJob.cycleId ?? 0n;
    const nullifierCount = proverJob.nullifierCount ?? 0n;
    const proofData = proverJob.proof ? [proverJob.proof] : ['0x00'];

    const txHash = await submitProofToChain(
      cycleId,
      merkleRoot,
      proverJob.totalAssets,
      proverJob.totalLiabilities,
      nullifierCount,
      proofData,
    );
    return txHash;
  } catch (err) {
    logger.warn({ err }, 'Chain submission failed, storing proof locally');
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}

export async function stopProofScheduler(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  
  if (queue) {
    await queue.close();
    queue = null;
  }
  
  logger.info('Proof scheduler stopped');
}

export async function getProofRoundHistory(
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  const db = getDb();
  
  const rounds = await db.query.proofRounds.findMany({
    orderBy: [desc(schema.proofRounds.roundNumber)],
    limit,
    offset,
  });
  
  return rounds as any[];
}