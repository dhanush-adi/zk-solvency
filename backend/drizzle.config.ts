import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgresql://cobra:zk123@localhost:5432/zk_solvency',
  },
  verbose: true,
  strict: true,
});