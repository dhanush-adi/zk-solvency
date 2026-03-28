import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '../../db/client.js';
import { getInclusionProof } from '../../services/merkleService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// authMiddleware removed for public verification
// router.use(authMiddleware);

router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
  const { userId, signature } = req.body;
  
  if (!userId || !signature) {
    res.status(400).json({ error: 'Missing required fields: userId, signature' });
    return;
  }
  
  const db = getDb();
  
  const account = await db.query.accounts.findFirst({
    where: eq(schema.accounts.userId, userId),
  }) as any;
  
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  
  const latestRound = await db.query.proofRounds.findFirst({
    where: eq(schema.proofRounds.status, 'verified'),
    orderBy: [desc(schema.proofRounds.roundNumber)],
  }) as any;
  
  if (!latestRound) {
    res.status(404).json({ error: 'No verified proof round found' });
    return;
  }
  
  const proof = await getInclusionProof(userId, latestRound.id);
  
  if (!proof) {
    res.status(404).json({ error: 'Could not generate inclusion proof' });
    return;
  }
  
  const isVerified = proof.leaf === account.hashedLeaf;
  
  res.json({
    userId,
    merkleProof: {
      leaf: proof.leaf,
      siblings: proof.siblings,
      pathIndices: proof.pathIndices,
    },
    roundId: latestRound.id,
    roundNumber: latestRound.roundNumber,
    merkleRoot: latestRound.merkleRoot,
    verified: isVerified,
    timestamp: new Date().toISOString(),
  });
}));

router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  // For now return an empty array or recent verified rounds
  const db = getDb();
  const rounds = await db.query.proofRounds.findMany({
    where: eq(schema.proofRounds.status, 'verified'),
    limit: 10,
    orderBy: [desc(schema.proofRounds.roundNumber)],
  });
  
  res.json(rounds);
}));

export default router;