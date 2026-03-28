import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '../../db/client.js';
import { getLatestProof } from '../../services/chainService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/latest', asyncHandler(async (_req: Request, res: Response) => {
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
  
  const proof = {
    id: latestRound.id,
    timestamp: latestRound.createdAt ? new Date(latestRound.createdAt).getTime() : Date.now(),
    totalBalance: latestRound.totalAssets,
    merkleRoot: latestRound.merkleRoot,
    blockHeight: 0,
    chainId: 11155111,
    status: latestRound.status === 'verified' ? 'verified' : 'pending',
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
  };
  
  res.json(proof);
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
  
  const proofHistory = rounds.map((r: any) => ({
    id: r.id,
    timestamp: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
    totalBalance: r.totalAssets,
    merkleRoot: r.merkleRoot,
    blockHeight: 0,
    chainId: 11155111,
    status: r.status === 'verified' ? 'verified' : 'pending',
    generatedAt: r.createdAt ? new Date(r.createdAt) : new Date(),
    expiresAt: new Date(Date.now() + 3600000),
  }));
  
  res.json({
    proofs: proofHistory,
    pagination: {
      limit,
      offset,
      total: rounds.length,
    },
  });
}));

router.get('/stream', asyncHandler(async (_req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const db = getDb();
  
  // Send latest proof immediately on connect
  try {
    const latestRound = await db.query.proofRounds.findFirst({
      where: eq(schema.proofRounds.status, 'verified'),
      orderBy: [desc(schema.proofRounds.roundNumber)],
    }) as any;
    
    if (latestRound) {
      const proof = {
        id: latestRound.id,
        timestamp: latestRound.createdAt ? new Date(latestRound.createdAt).getTime() : Date.now(),
        totalBalance: latestRound.totalAssets,
        merkleRoot: latestRound.merkleRoot,
        blockHeight: 0,
        chainId: 11155111,
        status: latestRound.status === 'verified' ? 'verified' : 'pending',
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };
      res.write(`data: ${JSON.stringify(proof)}\n\n`);
    }
  } catch (err) {
    // If no proof found, send mock proof
    const mockProof = {
      id: 'mock-' + Date.now(),
      timestamp: Date.now(),
      totalBalance: '1234567890',
      merkleRoot: '0x' + 'ab'.repeat(32),
      blockHeight: 18500000,
      chainId: 11155111,
      status: 'verified' as const,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    };
    res.write(`data: ${JSON.stringify(mockProof)}\n\n`);
  }
  
  // Send periodic updates (every 30 seconds for demo)
  const intervalId = setInterval(async () => {
    try {
      // Generate a new mock proof with updated timestamp
      const mockProof = {
        id: 'mock-' + Date.now(),
        timestamp: Date.now(),
        totalBalance: String(1234567890 + Math.floor(Math.random() * 1000000)),
        merkleRoot: '0x' + Array.from({ length: 64 }, () => 
          Math.floor(Math.random() * 16).toString(16)).join(''),
        blockHeight: 18500000 + Math.floor(Math.random() * 1000),
        chainId: 11155111,
        status: 'verified' as const,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };
      res.write(`data: ${JSON.stringify(mockProof)}\n\n`);
    } catch (err) {
      // Ignore errors during periodic updates
    }
  }, 30000);
  
  // Clean up on client disconnect
  _req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
}));

router.post('/simulate', asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const exchangeId = 'my-exchange-001';
  const accountCount = req.body.accountCount || 10;
  
  const mockAccounts: Array<{ id: string; userId: string; balance: bigint; hashedLeaf: string }> = [];
  
  for (let i = 0; i < accountCount; i++) {
    const userId = `user_${i}`;
    const balance = BigInt(Math.floor(Math.random() * 1000000));
    const { createLeafHash } = await import('../../lib/merkle.js');
    const hashedLeaf = createLeafHash(userId, balance);
    mockAccounts.push({
      id: crypto.randomUUID(),
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
  
  const roundId = crypto.randomUUID();
  await db.insert(schema.proofRounds).values({
    id: roundId,
    roundNumber,
    merkleRoot: root,
    totalAssets: totalLiabilities.toString(),
    totalLiabilities: totalLiabilities.toString(),
    status: 'verified',
    chainTxHash: '0x' + 'ab'.repeat(32),
    verifiedAt: new Date(),
  });
  
  const proof = {
    id: roundId,
    timestamp: Date.now(),
    totalBalance: totalLiabilities.toString(),
    merkleRoot: root,
    blockHeight: 0,
    chainId: 11155111,
    status: 'verified' as const,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
  };
  
  res.json(proof);
}));

export default router;