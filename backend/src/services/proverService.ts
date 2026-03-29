import { getEnv } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { getDb, schema } from '../db/client.js';
import { eq } from 'drizzle-orm';
import { getMerkleProof } from '../lib/merkle.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Pino from 'pino';

const logger = Pino({ name: 'prover-service' });

export interface ProverJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  merkleRoot: string;
  totalAssets: bigint;
  totalLiabilities: bigint;
  nullifierSetRoot: string;
  cycleId?: bigint;
  nullifierCount?: bigint;
  proof?: string;
  publicValues?: string;
  vkeyHash?: string;
  publicInputs?: {
    merkleRoot: string;
    totalAssets: string;
    totalLiabilities: string;
    nullifierSetRoot: string;
    cycleId?: string;
    nullifierCount?: string;
  };
  error?: string;
}

export interface SubmitJobParams {
  merkleRoot: string;
  totalAssets: bigint;
  totalLiabilities: bigint;
  nullifierSetRoot: string;
  roundId?: string;
  cycleId?: bigint;
}

const jobStorage = new Map<string, ProverJob>();

export class ProverError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ProverError';
  }
}

function isMockMode(): boolean {
  const env = getEnv();
  return env.MOCK_PROVER === 'true';
}

function getHostBinaryPath(): string {
  const env = getEnv();
  if (env.SP1_HOST_BINARY) return env.SP1_HOST_BINARY;
  // Default: compiled release binary relative to project root
  return path.resolve(
    process.cwd(),
    '../layer3-4/circuits/host/target/release/host'
  );
}

function getElfPath(): string {
  return path.resolve(
    process.cwd(),
    '../layer3-4/circuits/solvency/target/elf-compilation/riscv64im-succinct-zkvm-elf/release/solvency-circuit'
  );
}

/**
 * Build the JSON payload consumed by the Rust host binary.
 * This queries the DB for all accounts in the round, computes Merkle proofs
 * for each, and serializes in the format expected by the solvency circuit.
 */
async function buildProverInput(
  params: SubmitJobParams
): Promise<object> {
  const db = getDb();

  // Fetch all accounts for this round (exchangeId == roundId)
  const accounts = await db.query.accounts.findMany({
    where: eq(schema.accounts.exchangeId, params.roundId ?? ''),
  }) as any[];

  // Sort deterministically (mirrors merkleService)
  accounts.sort((a: any, b: any) => a.userId.localeCompare(b.userId));

  const leaves = accounts.map((a: any) => a.hashedLeaf as string);
  const userIds = accounts.map((a: any) => a.userId as string);
  const balances = accounts.map((a: any) => Number(BigInt(a.balance)));

  // Build per-account Merkle proofs
  const merkleProofs: number[][][] = [];
  for (let i = 0; i < leaves.length; i++) {
    const { siblings } = getMerkleProof(leaves, i);
    // siblings is string[] of hex, convert each to [u8; 32] as number[]
    const proofBytes = siblings.map((hex: string) => {
      const bytes = Buffer.from(hex.replace(/^0x/, ''), 'hex');
      // Pad / trim to exactly 32 bytes
      const arr = new Uint8Array(32);
      bytes.copy(Buffer.from(arr.buffer), Math.max(0, 32 - bytes.length));
      return Array.from(arr);
    });
    merkleProofs.push(proofBytes);
  }

  // Convert merkle root to [u8;32]
  const rootHex = params.merkleRoot.replace(/^0x/, '');
  const rootBytes = Array.from(Buffer.from(rootHex.padStart(64, '0'), 'hex').slice(0, 32));

  const cycleId = params.cycleId ?? BigInt(Date.now());
  const nullifierCount = BigInt(accounts.length);

  return {
    merkle_root: rootBytes,
    total_assets: Number(params.totalAssets),
    cycle_id: Number(cycleId),
    nullifier_count: Number(nullifierCount),
    balances,
    user_ids: userIds,
    merkle_proofs: merkleProofs,
  };
}

/**
 * Run the compiled Rust SP1 host binary synchronously via child_process.
 */
async function runSP1Host(input: object): Promise<{ proof: string; publicValues: string; vkeyHash: string }> {
  const tmpDir = os.tmpdir();
  const inputFile = path.join(tmpDir, `sp1-input-${Date.now()}.json`);
  const outputFile = path.join(tmpDir, `sp1-output-${Date.now()}.json`);

  fs.writeFileSync(inputFile, JSON.stringify(input, null, 2));

  const env = getEnv();
  const binaryPath = getHostBinaryPath();

  if (!fs.existsSync(binaryPath)) {
    throw new ProverError(
      `SP1 host binary not found at ${binaryPath}. Run: cargo build --release in layer3-4/circuits/host/`,
      'BINARY_NOT_FOUND'
    );
  }

  logger.info({ binaryPath, inputFile, outputFile }, 'Launching SP1 host prover');

  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, [inputFile, outputFile], {
      env: {
        ...process.env,
        SP1_PROVER: env.SP1_PROVER ?? 'network',
        NETWORK_PRIVATE_KEY: env.NETWORK_PRIVATE_KEY ?? env.PROVER_API_KEY ?? '',
        ELF_PATH: getElfPath(),
        RUST_LOG: 'info',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        logger.error({ code, stderr }, 'SP1 host binary failed');
        reject(new ProverError(`SP1 host exited with code ${code}: ${stderr.slice(0, 500)}`, 'PROVER_EXEC_FAILED'));
        return;
      }

      try {
        const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
        logger.info({ stdout }, 'SP1 proof completed');
        resolve({
          proof: output.proof,
          publicValues: output.public_values,
          vkeyHash: output.vkey_hash,
        });
      } catch (e) {
        reject(new ProverError(`Failed to parse SP1 output: ${e}`, 'OUTPUT_PARSE_FAILED'));
      } finally {
        try { fs.unlinkSync(inputFile); } catch {}
        try { fs.unlinkSync(outputFile); } catch {}
      }
    });

    proc.on('error', (err) => {
      reject(new ProverError(`Failed to spawn SP1 host: ${err.message}`, 'SPAWN_FAILED'));
    });
  });
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

function runMockProver(jobId: string, params: SubmitJobParams): void {
  setTimeout(() => {
    const job = jobStorage.get(jobId);
    if (job) {
      job.status = 'completed';
      job.proof = '0x' + 'ab'.repeat(128);
      job.publicInputs = {
        merkleRoot: params.merkleRoot,
        totalAssets: params.totalAssets.toString(),
        totalLiabilities: params.totalLiabilities.toString(),
        nullifierSetRoot: params.nullifierSetRoot,
      };
      logger.info({ jobId }, 'Mock proof completed');
    }
  }, 3000);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function submitJob(params: SubmitJobParams): Promise<string> {
  const jobId = uuidv4();
  const job: ProverJob = {
    jobId,
    status: 'pending',
    merkleRoot: params.merkleRoot,
    totalAssets: params.totalAssets,
    totalLiabilities: params.totalLiabilities,
    nullifierSetRoot: params.nullifierSetRoot,
    cycleId: params.cycleId,
    nullifierCount: undefined,
  };
  jobStorage.set(jobId, job);

  if (isMockMode()) {
    logger.warn('MOCK_PROVER=true — using simulated proof');
    runMockProver(jobId, params);
    return jobId;
  }

  // Real SP1 proving (async in background)
  job.status = 'processing';
  (async () => {
    try {
      logger.info({ jobId }, 'Building prover input from DB…');
      const input = await buildProverInput(params);

      logger.info({ jobId }, 'Submitting to SP1 Network…');
      const result = await runSP1Host(input);

      job.status = 'completed';
      job.proof = result.proof;
      job.publicValues = result.publicValues;
      job.vkeyHash = result.vkeyHash;
      job.publicInputs = {
        merkleRoot: params.merkleRoot,
        totalAssets: params.totalAssets.toString(),
        totalLiabilities: params.totalLiabilities.toString(),
        nullifierSetRoot: params.nullifierSetRoot,
      };
      logger.info({ jobId, vkeyHash: result.vkeyHash }, 'SP1 proof recorded');
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message;
      logger.error({ jobId, err }, 'SP1 proving failed');
    }
  })();

  return jobId;
}

export async function pollJob(jobId: string): Promise<ProverJob> {
  const job = jobStorage.get(jobId);
  if (!job) {
    throw new ProverError('Job not found', 'NOT_FOUND');
  }
  return job;
}

export async function waitForProof(
  jobId: string,
  timeoutMs: number = 600000,
  pollIntervalMs: number = 5000
): Promise<ProverJob> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const job = await pollJob(jobId);
    if (job.status === 'completed') {
      logger.info({ jobId }, 'Proof generation confirmed');
      return job;
    }
    if (job.status === 'failed') {
      throw new ProverError(job.error ?? 'Proof generation failed', 'PROOF_FAILED');
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  throw new ProverError('Proof generation timed out', 'TIMEOUT');
}

export async function cancelJob(jobId: string): Promise<void> {
  jobStorage.delete(jobId);
  logger.info({ jobId }, 'Job cancelled');
}