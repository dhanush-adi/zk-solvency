import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '../../db/client.js';
import { getRoot, getInclusionProof } from '../../services/merkleService.js';
import { getLatestProof } from '../../services/chainService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

const router = Router();

function keccak256(data: string): string {
  const hash = createHash('keccak256');
  hash.update(data);
  return '0x' + hash.digest('hex');
}

router.get('/latest-proof', asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();
  
  const latestRound = await db.query.proofRounds.findFirst({
    where: eq(schema.proofRounds.status, 'verified'),
    orderBy: [desc(schema.proofRounds.roundNumber)],
  }) as any;
  
  if (!latestRound) {
    res.status(404).json({ error: 'No verified proof rounds found' });
    return;
  }
  
  const onChainProof = await getLatestProof();
  
  res.json({
    roundId: latestRound.id,
    roundNumber: latestRound.roundNumber,
    merkleRoot: latestRound.merkleRoot,
    totalAssets: latestRound.totalAssets,
    totalLiabilities: latestRound.totalLiabilities,
    previousRoundHash: latestRound.previousRoundHash,
    starkProofCid: latestRound.starkProofCid,
    chainTxHash: latestRound.chainTxHash,
    status: latestRound.status,
    createdAt: latestRound.createdAt,
    verifiedAt: latestRound.verifiedAt,
    onChain: onChainProof ? {
      merkleRoot: onChainProof.merkleRoot,
      totalAssets: onChainProof.totalAssets.toString(),
      totalLiabilities: onChainProof.totalLiabilities.toString(),
      timestamp: onChainProof.timestamp,
    } : null,
  });
}));

router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  
  const db = getDb();
  const rounds = await db.query.proofRounds.findMany({
    orderBy: [desc(schema.proofRounds.roundNumber)],
    limit,
    offset,
  }) as any[];
  
  const total = await db.query.proofRounds.findMany() as any[];
  
  res.json({
    rounds: rounds.map((r: any) => ({
      roundId: r.id,
      roundNumber: r.roundNumber,
      merkleRoot: r.merkleRoot,
      totalAssets: r.totalAssets,
      totalLiabilities: r.totalLiabilities,
      status: r.status,
      createdAt: r.createdAt,
      verifiedAt: r.verifiedAt,
      chainTxHash: r.chainTxHash,
    })),
    pagination: {
      limit,
      offset,
      total: total.length,
    },
  });
}));

router.post('/simulate', asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const exchangeId = req.body.exchangeId || 'simulated-exchange';
  const accountCount = req.body.accountCount || 100;
  
  const mockAccounts: Array<{ id: string; userId: string; balance: bigint; hashedLeaf: string }> = [];
  
  for (let i = 0; i < accountCount; i++) {
    const userId = `user_${i}`;
    const balance = BigInt(Math.floor(Math.random() * 1000000));
    const hashedLeaf = keccak256(`${userId}:${balance}`);
    mockAccounts.push({
      id: uuidv4(),
      userId,
      balance,
      hashedLeaf,
    });
  }
  
  const totalLiabilities = mockAccounts.reduce((sum, acc) => sum + acc.balance, 0n);
  
  for (const account of mockAccounts) {
    await db.insert(schema.accounts).values({
      id: account.id,
      exchangeId,
      userId: account.userId,
      balance: account.balance.toString(),
      hashedLeaf: account.hashedLeaf,
    });
  }
  
  const leaves = mockAccounts.map(acc => acc.hashedLeaf);
  const { getMerkleRoot } = await import('../../lib/merkle.js');
  const root = getMerkleRoot(leaves);
  
  const latestRound = await db.query.proofRounds.findFirst({
    orderBy: [desc(schema.proofRounds.roundNumber)],
  }) as any;
  const roundNumber = (latestRound?.roundNumber || 0) + 1;
  
  const roundId = uuidv4();
  await db.insert(schema.proofRounds).values({
    id: roundId,
    roundNumber,
    merkleRoot: root,
    totalAssets: totalLiabilities.toString(),
    totalLiabilities: totalLiabilities.toString(),
    status: 'verified',
    chainTxHash: '0x' + 'ab'.repeat(32),
  });
  
  res.json({
    success: true,
    roundId,
    roundNumber,
    merkleRoot: root,
    totalAssets: totalLiabilities.toString(),
    totalLiabilities: totalLiabilities.toString(),
    accountCount,
    message: 'Simulated proof round created with mock accounts',
  });
}));

export default router;