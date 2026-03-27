import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../db/client.js';
import { getInclusionProof } from '../../services/merkleService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.post('/prove', asyncHandler(async (req: Request, res: Response) => {
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

export default router;