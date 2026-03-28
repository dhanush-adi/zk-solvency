/**
 * chain.js — Proof Chain Traversal (Flow B)
 *
 * Traverses the linked list of proof records on StarkNet and verifies
 * topological integrity, root consistency, and timestamp monotonicity.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProofRegistry, callContract } from '../lib/starknet.js';
import { ChainGapError, RootTamperError } from './errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Traverses the chain of proof records.
 *
 * @param {Object} params
 * @param {number|null} params.from_cycle - Start cycle (default 0)
 * @param {number|null} params.to_cycle   - End cycle (default latest)
 * @param {boolean} params.fast           - If true, skip artifact comparison
 *
 * @returns {Promise<import('./types').ChainResult>}
 */
export async function verifyChain({ from_cycle = 0, to_cycle = null, fast = false } = {}) {
  const registry = getProofRegistry();
  const latestCycleId = Number(await callContract(registry, 'get_latest_cycle_id'));
  
  const endCycle = Math.min(to_cycle ?? latestCycleId, latestCycleId);
  const startCycle = Math.max(from_cycle ?? 0, 0);
  
  const issues = [];
  let current = endCycle;
  let cyclesChecked = 0;
  const maxBatch = 100;

  // Max cap: 500 cycles per request (prevents RPC abuse)
  const maxTraversals = 500;
  let traversals = 0;

  let lastTimestamp = Infinity;
  let lastCycle = null;

  while (current >= startCycle && traversals < maxTraversals) {
    traversals++;
    cyclesChecked++;

    // 1. Fetch on-chain record
    const record = await callContract(registry, 'get_proof', [current]);
    
    // contract.call() might return an array or object depending on ABI
    const cycleId = Number(record[0] || record.cycle_id);
    const merkleRoot = '0x' + (record[1] || record.merkle_root).toString(16);
    const timestamp = Number(record[5] || record.timestamp);
    const prevCycleId = Number(record[6] || record.previous_cycle_id);

    // 2. Validate cycle_id (tamper check)
    if (cycleId !== current) {
      issues.push({
        type: 'record_inconsistent',
        severity: 'critical',
        at_cycle: current,
        detail: `Record cycle_id (${cycleId}) mismatch with query ID (${current})`
      });
    }

    // 3. Merkle root validation (if not fast)
    if (!fast) {
      const artifactPath = path.join(ROOT, 'proofs', `${current}.json`);
      if (!fs.existsSync(artifactPath)) {
        issues.push({
          type: 'artifact_missing',
          severity: 'warning',
          at_cycle: current,
          detail: `Cycle ${current} proof artifact not found in /proofs`
        });
      } else {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        const artifactRoot = artifact.merkleRoot;
        // String comparison of 0x hex roots
        if (merkleRoot !== artifactRoot) {
          issues.push({
            type: 'root_tampered',
            severity: 'critical',
            at_cycle: current,
            detail: `On-chain root ${merkleRoot} !== Artifact root ${artifactRoot}`
          });
        }
      }
    }

    // 4. Validate links (gap detection)
    if (current > startCycle) {
      const expectedPrev = current - 1;
      if (prevCycleId !== expectedPrev) {
        issues.push({
          type: 'gap',
          severity: 'critical',
          at_cycle: current,
          detail: `Prev ID ${prevCycleId} !== Expected ${expectedPrev}`
        });
      }
    }

    // 5. Monotonicity validation
    // Since we're going backwards, timestamp should be decreasing
    if (timestamp >= lastTimestamp) {
        issues.push({
            type: 'timestamp_anomaly',
            severity: 'warning',
            at_cycle: current,
            detail: `Timestamp ${timestamp} not strictly less than subsequent cycle ${lastCycle}'s timestamp ${lastTimestamp}`
          });
    }

    lastTimestamp = timestamp;
    lastCycle = current;
    current = prevCycleId;

    // Handle batch pagination or safety exit (prevent endless loops)
    if (traversals % maxBatch === 0 && current >= startCycle) {
        // Just small pause if needed later, right now continue loop
    }
  }

  const chainIntact = issues.filter(i => i.severity === 'critical').length === 0;

  return {
    from_cycle: startCycle,
    to_cycle: endCycle,
    cycles_checked: cyclesChecked,
    chain_intact: chainIntact,
    issues,
    verified_at: Math.floor(Date.now() / 1000)
  };
}

/**
 * Returns only gaps detected in the chain.
 */
export async function getChainGaps(from_cycle, to_cycle) {
  const result = await verifyChain({ from_cycle, to_cycle, fast: true });
  return { gaps: result.issues.filter(i => i.type === 'gap') };
}
