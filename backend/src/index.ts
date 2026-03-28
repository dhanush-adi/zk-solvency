import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { initEnv, getEnv } from './config/env.js';
import { getRedisClient, closeRedis } from './config/redis.js';
import { getDb, closeDb } from './db/client.js';
import router from './api/router.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import { initProofScheduler, startProofScheduler, stopProofScheduler } from './services/proofScheduler.js';
import Pino from 'pino';

const logger = Pino({ name: 'main' });

async function main() {
  initEnv();
  const env = getEnv();
  
  logger.info({ env: env.NODE_ENV }, 'Starting ZK-Solvency Backend');
  
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
      }, 'Request completed');
    });
    next();
  });
  
  app.use('/api', router);
  
  app.use(errorHandler);
  
  try {
    getRedisClient();
  } catch (e) { logger.warn('Redis not connected'); }
  
  try {
    getDb();
  } catch (e) { logger.warn('Database not connected'); }
  
  // Scheduler only starts if PROVER_API_URL is set
  // Otherwise the API can still be used without auto-proof generation
  logger.info('Proof scheduler disabled (requires PROVER_API_URL)');
  
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Server started');
  });
  
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    
    server.close();
    
    try {
      await stopProofScheduler();
    } catch (err) {
      logger.error({ err }, 'Error stopping proof scheduler');
    }
    
    try {
      await closeRedis();
    } catch (err) {
      logger.error({ err }, 'Error closing Redis');
    }
    
    try {
      await closeDb();
    } catch (err) {
      logger.error({ err }, 'Error closing DB');
    }
    
    logger.info('Shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
