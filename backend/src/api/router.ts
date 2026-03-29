import { Router } from 'express';
import healthRouter from './routes/health.js';
import solvencyRouter from './routes/solvency.js';
import proofRouter from './routes/proof.js';
import inclusionRouter from './routes/inclusion.js';
import auditorRouter from './routes/auditor.js';
import attestationRouter from './routes/attestation.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/solvency', solvencyRouter);
router.use('/proof', proofRouter);
router.use('/inclusion-proof', inclusionRouter);
router.use('/auditor', auditorRouter);
router.use('/attest', attestationRouter);

router.get('/', (_req, res) => {
  res.json({
    name: 'ZK-Solvency API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    documentation: {
      landing: 'http://localhost:3001/',
      frontend: 'http://localhost:3000/',
    },
    endpoints: [
      {
        category: 'Health & Status',
        routes: [
          {
            method: 'GET',
            path: '/api/health',
            description: 'System health check including Redis, Database, and Server status',
            response: '{ status, checks: { redis, database, server, environment } }',
          },
        ],
      },
      {
        category: 'Proof of Reserves',
        routes: [
          {
            method: 'GET',
            path: '/api/proof/latest',
            description: 'Get the latest verified proof of reserves',
            response: '{ id, timestamp, totalBalance, merkleRoot, blockHeight, chainId, status, generatedAt, expiresAt }',
          },
          {
            method: 'GET',
            path: '/api/proof/history',
            description: 'Get historical proof records with pagination',
            params: { limit: 'number (default: 50)', offset: 'number (default: 0)' },
          },
          {
            method: 'GET',
            path: '/api/proof/stream',
            description: 'Server-Sent Events stream for real-time proof updates',
          },
          {
            method: 'POST',
            path: '/api/proof/simulate',
            description: 'Generate simulated proof with mock data (dev only)',
          },
        ],
      },
      {
        category: 'Solvency Management',
        routes: [
          {
            method: 'GET',
            path: '/api/solvency/latest-proof',
            description: 'Get latest solvency proof round',
          },
          {
            method: 'GET',
            path: '/api/solvency/history',
            description: 'Get solvency history with pagination',
            params: { limit: 'number (max 100)', offset: 'number', days: 'number' },
          },
          {
            method: 'POST',
            path: '/api/solvency/simulate',
            description: 'Create simulated solvency proof with mock accounts',
            body: { accountCount: 'number (default: 100)' },
            example: 'curl -X POST http://localhost:3001/api/solvency/simulate -H "Content-Type: application/json" -d \'{"accountCount": 100}\'',
          },
        ],
      },
      {
        category: 'Inclusion Proofs',
        routes: [
          {
            method: 'POST',
            path: '/api/inclusion-proof/verify',
            description: 'Verify user inclusion in Merkle tree',
            body: { userId: 'string', signature: 'string' },
            response: '{ id, wallet, userId, balance, merkleProof, merkleRoot, leafIndex, verified, proofOfReservesId }',
            example: 'curl -X POST http://localhost:3001/api/inclusion-proof/verify -H "Content-Type: application/json" -d \'{"userId": "user_0", "signature": "demo"}\'',
          },
          {
            method: 'GET',
            path: '/api/inclusion-proof/history',
            description: 'Get recent verified proof rounds',
          },
        ],
      },
      {
        category: 'Auditor Tools',
        routes: [
          {
            method: 'GET',
            path: '/api/auditor/verify',
            description: 'Verify chain integrity and audit pack (requires x402 payment)',
          },
          {
            method: 'GET',
            path: '/api/auditor/circuit-registry',
            description: 'Get circuit registry and attestations (requires x402 payment)',
          },
        ],
      },
      {
        category: 'Attestation',
        routes: [
          {
            method: 'POST',
            path: '/api/attest/balances',
            description: 'Attest account balances with signature',
            body: {
              balances: 'Array<{ userId, balance, accountId, timestamp }>',
              signature: 'string',
              exchangeId: 'string',
            },
          },
          {
            method: 'GET',
            path: '/api/attest/status/:exchangeId',
            description: 'Get attestation status for exchange',
          },
        ],
      },
    ],
    quickStart: {
      step1: 'Generate test data: POST /api/solvency/simulate',
      step2: 'View latest proof: GET /api/proof/latest',
      step3: 'Verify inclusion: POST /api/inclusion-proof/verify',
      step4: 'Open dashboard: http://localhost:3000',
    },
  });
});

export default router;