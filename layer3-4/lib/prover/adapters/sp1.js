/**
 * sp1.js — SP1 Prover Adapter
 *
 * Primary prover backend. Interfaces with SP1 SDK/CLI for proof generation.
 * Falls back to mock proof generation when MOCK_PROVER=true.
 *
 * Interface: { prove(inputs), verify(proof, publicInputs) }
 */

import { execSync } from 'child_process';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CIRCUIT_DIR = path.resolve(__dirname, '../../../circuits/solvency');

/**
 * Generate a proof from structured inputs.
 *
 * @param {{publicInputs: object, privateInputs: object}} inputs
 * @returns {Promise<{proof: string, publicInputs: object}>}
 */
export async function prove(inputs) {
  if (process.env.MOCK_PROVER === 'true') {
    return mockProve(inputs);
  }

  return sp1Prove(inputs);
}

/**
 * Verify a proof against public inputs.
 *
 * @param {string} proof — hex proof string
 * @param {object} publicInputs
 * @returns {Promise<boolean>}
 */
export async function verify(proof, publicInputs) {
  if (process.env.MOCK_PROVER === 'true') {
    return mockVerify(proof, publicInputs);
  }

  return sp1Verify(proof, publicInputs);
}

// ── Mock Implementation ─────────────────────────────────────────────────

function mockProve(inputs) {
  const { publicInputs } = inputs;

  // Generate a deterministic mock proof from public inputs
  const proofData = ethers.solidityPackedKeccak256(
    ['bytes32', 'uint256', 'uint256', 'uint64', 'uint64'],
    [
      publicInputs.merkleRoot,
      publicInputs.totalAssets,
      publicInputs.totalLiabilities,
      publicInputs.cycleId,
      publicInputs.nullifierCount,
    ]
  );

  // Validate solvency assertion in mock mode
  if (publicInputs.totalAssets <= publicInputs.totalLiabilities) {
    console.warn('⚠️  Mock prover: assets <= liabilities (insolvency detected)');
  }

  // Validate sum matches
  const balanceSum = inputs.privateInputs.balances.reduce((a, b) => a + b, 0n);
  if (balanceSum !== publicInputs.totalLiabilities) {
    throw new Error(
      `Mock prover: balance sum ${balanceSum} !== totalLiabilities ${publicInputs.totalLiabilities}`
    );
  }

  // Validate count matches
  if (BigInt(inputs.privateInputs.balances.length) !== publicInputs.nullifierCount) {
    throw new Error(
      `Mock prover: balance count ${inputs.privateInputs.balances.length} !== nullifierCount ${publicInputs.nullifierCount}`
    );
  }

  return {
    proof: proofData,
    publicInputs: {
      merkleRoot: publicInputs.merkleRoot,
      totalAssets: publicInputs.totalAssets.toString(),
      totalLiabilities: publicInputs.totalLiabilities.toString(),
      cycleId: publicInputs.cycleId.toString(),
      nullifierCount: publicInputs.nullifierCount.toString(),
    },
  };
}

function mockVerify(proof, publicInputs) {
  // Recompute expected proof and compare
  const expected = ethers.solidityPackedKeccak256(
    ['bytes32', 'uint256', 'uint256', 'uint64', 'uint64'],
    [
      publicInputs.merkleRoot,
      BigInt(publicInputs.totalAssets),
      BigInt(publicInputs.totalLiabilities),
      BigInt(publicInputs.cycleId),
      BigInt(publicInputs.nullifierCount),
    ]
  );

  return proof === expected;
}

// ── SP1 Implementation ──────────────────────────────────────────────────

async function sp1Prove(inputs) {
  // Write inputs to a temp file for the SP1 circuit
  const inputPath = path.join(CIRCUIT_DIR, 'input.json');
  const outputPath = path.join(CIRCUIT_DIR, 'output.json');

  const inputData = {
    merkle_root: inputs.publicInputs.merkleRoot,
    total_assets: inputs.publicInputs.totalAssets.toString(),
    total_liabilities: inputs.publicInputs.totalLiabilities.toString(),
    cycle_id: inputs.publicInputs.cycleId.toString(),
    nullifier_count: inputs.publicInputs.nullifierCount.toString(),
    balances: inputs.privateInputs.balances.map(b => b.toString()),
    user_ids: inputs.privateInputs.userIds,
    merkle_proofs: inputs.privateInputs.merkleProofs,
  };

  fs.writeFileSync(inputPath, JSON.stringify(inputData, null, 2));

  try {
    // Run SP1 prover
    execSync('cargo prove --input input.json --output output.json', {
      cwd: CIRCUIT_DIR,
      stdio: 'pipe',
      timeout: 600000, // 10 minute timeout
    });

    const output = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    return {
      proof: output.proof,
      publicInputs: output.public_inputs,
    };
  } finally {
    // Cleanup temp files
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}

async function sp1Verify(proof, publicInputs) {
  // SP1 provides a verifier binary for off-chain verification
  try {
    const result = execSync(
      `cargo prove verify --proof "${proof}"`,
      { cwd: CIRCUIT_DIR, stdio: 'pipe', timeout: 60000 }
    );
    return result.toString().includes('verified');
  } catch {
    return false;
  }
}

export const name = 'sp1';
