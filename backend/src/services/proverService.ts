import { getEnv } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
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
}

const mockJobStorage = new Map<string, ProverJob>();

export class ProverError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ProverError';
  }
}

export async function submitJob(params: SubmitJobParams): Promise<string> {
  const env = getEnv();
  
  if (!env.PROVER_API_URL || !env.PROVER_API_KEY) {
    logger.warn('Prover API not configured, using mock');
    const jobId = uuidv4();
    const mockJob: ProverJob = {
      jobId,
      status: 'pending',
      merkleRoot: params.merkleRoot,
      totalAssets: params.totalAssets,
      totalLiabilities: params.totalLiabilities,
      nullifierSetRoot: params.nullifierSetRoot,
    };
    mockJobStorage.set(jobId, mockJob);
    
    setTimeout(() => {
      const job = mockJobStorage.get(jobId);
      if (job) {
        job.status = 'completed';
        job.proof = '0x' + 'ab'.repeat(128);
        job.publicInputs = {
          merkleRoot: params.merkleRoot,
          totalAssets: params.totalAssets.toString(),
          totalLiabilities: params.totalLiabilities.toString(),
          nullifierSetRoot: params.nullifierSetRoot,
        };
      }
    }, 5000);
    
    return jobId;
  }
  
  try {
    const response = await fetch(`${env.PROVER_API_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.PROVER_API_KEY}`,
      },
      body: JSON.stringify({
        circuit: 'solvency',
        input: {
          merkle_root: params.merkleRoot,
          total_assets: params.totalAssets.toString(),
          total_liabilities: params.totalLiabilities.toString(),
          nullifier_set_root: params.nullifierSetRoot,
        },
      }),
    });
    
    if (!response.ok) {
      throw new ProverError(`Prover API error: ${response.status}`, 'API_ERROR');
    }
    
    const data = await response.json() as { job_id: string };
    return data.job_id;
  } catch (err) {
    logger.error({ err }, 'Failed to submit prover job');
    throw new ProverError('Failed to submit proof job', 'SUBMIT_FAILED');
  }
}

export async function pollJob(jobId: string): Promise<ProverJob> {
  const env = getEnv();
  
  if (!env.PROVER_API_URL || !env.PROVER_API_KEY) {
    const mockJob = mockJobStorage.get(jobId);
    if (!mockJob) {
      throw new ProverError('Job not found', 'NOT_FOUND');
    }
    return mockJob;
  }
  
  try {
    const response = await fetch(`${env.PROVER_API_URL}/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${env.PROVER_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      throw new ProverError(`Prover API error: ${response.status}`, 'API_ERROR');
    }
    
    const data: any = await response.json();
    
    return {
      jobId,
      status: data.status,
      merkleRoot: data.input?.merkle_root || '',
      totalAssets: data.input ? BigInt(data.input.total_assets) : 0n,
      totalLiabilities: data.input ? BigInt(data.input.total_liabilities) : 0n,
      nullifierSetRoot: data.input?.nullifier_set_root || '',
      proof: data.proof,
      publicInputs: data.public_inputs
        ? {
            merkleRoot: data.public_inputs.merkle_root,
            totalAssets: data.public_inputs.total_assets,
            totalLiabilities: data.public_inputs.total_liabilities,
            nullifierSetRoot: data.public_inputs.nullifier_set_root,
          }
        : undefined,
      error: data.error,
    };
  } catch (err) {
    logger.error({ err, jobId }, 'Failed to poll prover job');
    throw new ProverError('Failed to poll proof job', 'POLL_FAILED');
  }
}

export async function waitForProof(
  jobId: string,
  timeoutMs: number = 300000,
  pollIntervalMs: number = 5000
): Promise<ProverJob> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const job = await pollJob(jobId);
    
    if (job.status === 'completed') {
      logger.info({ jobId }, 'Proof generated successfully');
      return job;
    }
    
    if (job.status === 'failed') {
      throw new ProverError(job.error || 'Proof generation failed', 'PROOF_FAILED');
    }
    
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  throw new ProverError('Proof generation timed out', 'TIMEOUT');
}

export async function cancelJob(jobId: string): Promise<void> {
  mockJobStorage.delete(jobId);
  logger.info({ jobId }, 'Job cancelled');
}