import { pgTable, varchar, timestamp, index, text } from 'drizzle-orm/pg-core';

export const nullifiers = pgTable('nullifiers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nullifierHash: varchar('nullifier_hash', { length: 66 }).notNull(),
  accountId: varchar('account_id', { length: 36 }).notNull(),
  roundId: varchar('round_id', { length: 36 }).notNull(),
  onChainConfirmed: varchar('on_chain_confirmed', { length: 1 }).default('0'),
  txHash: varchar('tx_hash', { length: 66 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at'),
}, (table) => ({
  nullifierHashIdx: index('nullifiers_hash_idx').on(table.nullifierHash),
  accountIdIdx: index('nullifiers_account_id_idx').on(table.accountId),
  roundIdIdx: index('nullifiers_round_id_idx').on(table.roundId),
  txHashIdx: index('nullifiers_tx_hash_idx').on(table.txHash),
  uniqueRoundAccount: index('nullifiers_unique_round_account').on(table.roundId, table.accountId),
}));

export type Nullifier = typeof nullifiers.$inferSelect;
export type NewNullifier = typeof nullifiers.$inferInsert;
