import { Router, Request, Response } from 'express';
import { getRedisClient } from '../../config/redis.js';
import { getDb, schema } from '../../db/client.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  
  try {
    const start = Date.now();
    const redis = getRedisClient();
    if (!redis) throw new Error('Redis client not initialized');
    await redis.ping();
    checks.redis = { status: 'healthy', latency: Date.now() - start };
  } catch (err) {
    checks.redis = { status: 'unhealthy', error: err instanceof Error ? err.message : 'Unknown error' };
  }
  
  try {
    const start = Date.now();
    const db = getDb();
    await db.select().from(schema.accounts).limit(1);
    checks.database = { status: 'healthy', latency: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'unhealthy', error: err instanceof Error ? err.message : 'Unknown error' };
  }
  
  checks.server = { status: 'healthy' };
  checks.environment = { status: 'development' };
  
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
