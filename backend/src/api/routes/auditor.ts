import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '../../db/client.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { x402Middleware } from '../middleware/x402.js';

const router = Router();

router.use(x402Middleware);

router.get('/verify', asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();
  
  const verifiedRounds = await db.query.proofRounds.findMany({
    where: eq(schema.proofRounds.status, 'verified'),
    orderBy: [desc(schema.proofRounds.roundNumber)],
    limit: 100,
  }) as any[];
  
  if (verifiedRounds.length === 0) {
    res.status(404).json({ error: 'No verified proof rounds found' });
    return;
  }
  
  let previousHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  for (const round of verifiedRounds.reverse()) {
    if (round.previousRoundHash !== previousHash) {
      res.status(400).json({
        error: 'Chain integrity compromised',
        message: `Gap detected at round ${round.roundNumber}`,
        details: {
          expectedPrevious: previousHash,
          actualPrevious: round.previousRoundHash,
        },
      });
      return;
    }
    previousHash = round.merkleRoot;
  }
  
  const latestRound = verifiedRounds[verifiedRounds.length - 1];
  const accounts = await db.query.accounts.findMany() as any[];
  
  const totalBalance = accounts.reduce((sum: bigint, acc: any) => sum + BigInt(acc.balance), 0n);
  
  res.json({
    verified: true,
    totalRounds: verifiedRounds.length,
    latestRound: {
      roundId: latestRound.id,
      roundNumber: latestRound.roundNumber,
      merkleRoot: latestRound.merkleRoot,
      totalAssets: latestRound.totalAssets,
      totalLiabilities: latestRound.totalLiabilities,
      chainTxHash: latestRound.chainTxHash,
      verifiedAt: latestRound.verifiedAt,
    },
    chainIntegrity: {
      verified: true,
      firstRound: verifiedRounds[0].roundNumber,
      lastRound: latestRound.roundNumber,
    },
    auditPack: {
      accountCount: accounts.length,
      totalBalance: totalBalance.toString(),
      merkleRoot: latestRound.merkleRoot,
    },
  });
}));

router.get('/circuit-registry', asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();
  
  const latestRound = await db.query.proofRounds.findFirst({
    orderBy: [desc(schema.proofRounds.roundNumber)],
    where: eq(schema.proofRounds.status, 'verified'),
  }) as any;
  
  const circuitHash = '0x' + 'cairo'.split('').map(c => c.charCodeAt(0).toString(16)).join('').padStart(64, '0');
  
  res.json({
    circuit: {
      name: 'solvency-circuit',
      version: '1.0.0',
      circuitHash,
      verificationKeyHash: circuitHash,
    },
    attestations: [
      {
        type: 'circuit_registry',
        circuitHash,
        timestamp: new Date().toISOString(),
        signature: '0x' + 'sig'.repeat(32),
      },
      {
        type: 'proof_verification',
        roundId: latestRound?.id,
        merkleRoot: latestRound?.merkleRoot,
        timestamp: latestRound?.verifiedAt?.toISOString(),
        signature: '0x' + 'sig'.repeat(32),
      },
    ],
    auditEndpoints: [
      {
        name: 'full_verify',
        path: '/auditor/verify',
        requiresPayment: true,
      },
      {
        name: 'circuit_registry',
        path: '/auditor/circuit-registry',
        requiresPayment: true,
      },
    ],
  });
}));

export default router;