import { Router, Request, Response } from 'express';
import { getDb, schema } from '../../db/client.js';
import { processAttestation, saveAttestedAccounts } from '../../services/attestationService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEnv } from '../../config/env.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/balances', asyncHandler(async (req: Request, res: Response) => {
  const { balances, signature, exchangeId } = req.body;
  
  if (!balances || !Array.isArray(balances)) {
    res.status(400).json({ error: 'balances must be an array' });
    return;
  }
  
  if (!signature) {
    res.status(400).json({ error: 'signature is required' });
    return;
  }
  
  const env = getEnv();
  const exchange = exchangeId || env.EXCHANGE_ID;
  
  const rawData = balances.map((item: Record<string, string>) => ({
    userId: item.userId,
    balance: item.balance,
    accountId: item.accountId || item.userId,
    timestamp: item.timestamp || Date.now(),
  }));
  
  const accounts = await processAttestation(rawData, signature);
  
  await saveAttestedAccounts(accounts, exchange);
  
  res.json({
    success: true,
    exchangeId: exchange,
    accountCount: accounts.length,
    blockTimestamp: Date.now(),
    message: `Successfully attested ${accounts.length} accounts`,
  });
}));

router.get('/status/:exchangeId', asyncHandler(async (req: Request, res: Response) => {
  const { exchangeId } = req.params;
  const db = getDb();
  
  const accounts = await db.query.accounts.findMany({
    where: eq(schema.accounts.exchangeId, exchangeId),
  }) as any[];
  
  const totalBalance = accounts.reduce((sum: bigint, acc: any) => sum + BigInt(acc.balance), 0n);
  
  res.json({
    exchangeId,
    accountCount: accounts.length,
    totalBalance: totalBalance.toString(),
    lastUpdated: accounts[0]?.updatedAt?.toISOString(),
    status: 'active',
  });
}));

export default router;