import { pgTable, varchar, timestamp, integer, text, index, numeric } from 'drizzle-orm/pg-core';

export const proofRounds = pgTable('proof_rounds', {
  id: varchar('id', { length: 36 }).primaryKey(),
  roundNumber: integer('round_number').notNull().unique(),
  merkleRoot: varchar('merkle_root', { length: 66 }).notNull(),
  totalAssets: numeric('total_assets', { precision: 78, scale: 0 }).notNull(),
  totalLiabilities: numeric('total_liabilities', { precision: 78, scale: 0 }).notNull(),
  starkProofCid: text('stark_proof_cid'),
  chainTxHash: varchar('chain_tx_hash', { length: 66 }),
  previousRoundHash: varchar('previous_round_hash', { length: 66 }),
  cycleId: integer('cycle_id'),
  nullifierCount: integer('nullifier_count'),
  proofData: text('proof_data'),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  error_message: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  verifiedAt: timestamp('verified_at'),
}, (table) => ({
  roundNumberIdx: index('proof_rounds_round_number_idx').on(table.roundNumber),
  merkleRootIdx: index('proof_rounds_merkle_root_idx').on(table.merkleRoot),
  statusIdx: index('proof_rounds_status_idx').on(table.status),
  chainTxHashIdx: index('proof_rounds_chain_tx_hash_idx').on(table.chainTxHash),
}));

export type ProofRound = typeof proofRounds.$inferSelect;
export type NewProofRound = typeof proofRounds.$inferInsert;
