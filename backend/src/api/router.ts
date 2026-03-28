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
    endpoints: {
      health: 'GET /health',
      solvency: {
        latestProof: 'GET /solvency/latest-proof',
        history: 'GET /solvency/history',
        simulate: 'POST /solvency/simulate',
      },
      proof: {
        latest: 'GET /proof/latest',
        history: 'GET /proof/history',
        simulate: 'POST /proof/simulate',
      },
      inclusion: {
        prove: 'POST /inclusion/prove',
      },
      auditor: {
        verify: 'GET /auditor/verify',
        circuitRegistry: 'GET /auditor/circuit-registry',
      },
      attestation: {
        balances: 'POST /attest/balances',
        status: 'GET /attest/status/:exchangeId',
      },
    },
  });
});

export default router;