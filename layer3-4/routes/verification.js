/**
 * verification.js — Express Router for Layer 7 Verification
 *
 * Mounts at prefix /v1/verify
 */

import { Router } from 'express';
import { verifyInclusion, verifyChain, getChainGaps } from '../verification/index.js';
import { getProofRegistry, callContract } from '../lib/starknet.js';

const router = Router();

/**
 * Simple in-memory rate limiter for inclusion verify (20 req/min per IP)
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 20;

const rateLimit = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const userData = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

  if (now > userData.resetAt) {
    userData.count = 1;
    userData.resetAt = now + RATE_LIMIT_WINDOW;
  } else {
    userData.count++;
  }

  rateLimitMap.set(ip, userData);

  if (userData.count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
};

/**
 * POST /v1/verify/inclusion
 * 
 * Verifies user inclusion in a specific cycle.
 * Does NOT log user_id or balance.
 */
router.post('/inclusion', rateLimit, async (req, res) => {
  try {
    const { user_id, balance, cycle_id, merkle_proof } = req.body;
    
    if (!user_id || !balance) {
      return res.status(400).json({ error: 'Missing user_id or balance' });
    }

    const result = await verifyInclusion({ user_id, balance, cycle_id, merkle_proof });
    res.json(result);
  } catch (err) {
    console.error('[API Error] inclusion', err.message);
    res.status(err.name === 'InclusionError' ? 404 : 500).json({
      error: 'Inclusion verification failed',
      message: err.message
    });
  }
});

/**
 * GET /v1/verify/chain
 */
router.get('/chain', async (req, res) => {
  try {
    const { from_cycle, to_cycle, fast } = req.query;
    const result = await verifyChain({
      from_cycle: from_cycle ? Number(from_cycle) : 0,
      to_cycle: to_cycle ? Number(to_cycle) : null,
      fast: fast === 'true'
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Chain verification failed', message: err.message });
  }
});

/**
 * GET /v1/verify/chain/gaps
 */
router.get('/chain/gaps', async (req, res) => {
  try {
    const { from_cycle, to_cycle } = req.query;
    const result = await getChainGaps(
      from_cycle ? Number(from_cycle) : 0,
      to_cycle ? Number(to_cycle) : null
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Gap search failed', message: err.message });
  }
});

/**
 * Helper to fetch ProofRecord and format for JS
 */
async function getProofRecord(cycleId) {
  const registry = getProofRegistry();
  const record = await callContract(registry, 'get_proof', [Number(cycleId)]);
  
  // Convert fields (handling both array and object returns from starknet.js)
  return {
    cycle_id: Number(record[0] || record.cycle_id),
    merkle_root: '0x' + (record[1] || record.merkle_root).toString(16).padStart(64, '0'),
    total_assets: record[2]?.toString() || record.total_assets?.toString(), // u256 as string
    total_liabilities: record[3]?.toString() || record.total_liabilities?.toString(),
    nullifier_count: Number(record[4] || record.nullifier_count),
    timestamp: Number(record[5] || record.timestamp),
    previous_cycle_id: Number(record[6] || record.previous_cycle_id),
    verified: record[7] || record.verified
  };
}

/**
 * GET /v1/verify/proof/:cycle_id
 */
router.get('/proof/:cycle_id', async (req, res) => {
  try {
    const record = await getProofRecord(req.params.cycle_id);
    res.json(record);
  } catch (err) {
    res.status(404).json({ error: 'Proof record not found', message: err.message });
  }
});

/**
 * GET /v1/verify/latest
 */
router.get('/latest', async (req, res) => {
  try {
    const registry = getProofRegistry();
    const latestId = await callContract(registry, 'get_latest_cycle_id');
    const record = await getProofRecord(Number(latestId));
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest proof', message: err.message });
  }
});

/**
 * GET /v1/verify/status
 */
router.get('/status', async (req, res) => {
  try {
    const registry = getProofRegistry();
    const latestId = Number(await callContract(registry, 'get_latest_cycle_id'));
    const isSolvent = await callContract(registry, 'is_solvent');
    
    // Fast chain check for last 10 cycles
    const chainCheck = await verifyChain({ from_cycle: Math.max(0, latestId - 10), fast: true });
    
    let lastTime = 0;
    if (latestId > 0) {
      const lastProof = await callContract(registry, 'get_proof', [latestId]);
      lastTime = Number(lastProof[5] || lastProof.timestamp);
    }

    res.json({
      latest_cycle_id: latestId,
      is_solvent: isSolvent,
      chain_intact: chainCheck.chain_intact,
      last_proof_age_sec: Math.max(0, Math.floor(Date.now() / 1000) - lastTime),
      starknet_rpc: 'ok'
    });
  } catch (err) {
    res.json({
      starknet_rpc: 'degraded',
      message: err.message
    });
  }
});

export default router;
