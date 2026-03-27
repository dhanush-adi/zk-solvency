import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  // StarkNet
  STARKNET_RPC_URL: z.string().min(1),
  STARKNET_PRIVATE_KEY: z.string().min(1).optional(),
  STARKNET_ACCOUNT_ADDRESS: z.string().min(1).optional(),

  // Contract Addresses (StarkNet)
  NULLIFIER_REGISTRY_ADDRESS: z.string().min(1),
  SOLVENCY_VERIFIER_ADDRESS: z.string().min(1),
  PROOF_REGISTRY_ADDRESS: z.string().min(1),

  // Prover
  PROVER_API_URL: z.string().url().optional(),
  PROVER_API_KEY: z.string().min(1).optional(),
  PROVER_ADAPTER: z.enum(['sp1', 'stark']).default('sp1'),
  MOCK_PROVER: z.enum(['true', 'false']).default('false'),

  // Authentication
  JWT_SECRET: z.string().min(32),
  X402_GATEWAY_SECRET: z.string().min(1),

  // Scheduling
  PROOF_INTERVAL_MS: z.coerce.number().default(600000),

  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Exchange
  EXCHANGE_ID: z.string().min(1),
  ZKTL_SECRET_KEY: z.string().min(1).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let envConfig: EnvConfig;

export function initEnv(): EnvConfig {
  if (envConfig) {
    return envConfig;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid environment configuration: ${errors}`);
  }

  envConfig = result.data;
  return envConfig;
}

export function getEnv(): EnvConfig {
  if (!envConfig) {
    return initEnv();
  }
  return envConfig;
}
