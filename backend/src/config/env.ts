import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CHAIN_RPC_URL: z.string().min(1),
  PRIVATE_KEY: z.string().min(1).optional(),
  NULLIFIER_REGISTRY_ADDRESS: z.string().min(42),
  VERIFIER_CONTRACT_ADDRESS: z.string().min(42),
  PROOF_CHAIN_ADDRESS: z.string().min(42),
  PROVER_API_URL: z.string().url().optional(),
  PROVER_API_KEY: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32),
  X402_GATEWAY_SECRET: z.string().min(1),
  PROOF_INTERVAL_MS: z.coerce.number().default(600000),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
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
