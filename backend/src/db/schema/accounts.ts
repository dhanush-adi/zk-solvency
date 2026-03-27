import { pgTable, varchar, numeric, timestamp, index, text } from 'drizzle-orm/pg-core';

export const accounts = pgTable('accounts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  exchangeId: varchar('exchange_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  balance: numeric('balance', { precision: 78, scale: 0 }).notNull(),
  balanceEncrypted: text('balance_encrypted'),
  hashedLeaf: varchar('hashed_leaf', { length: 66 }).notNull(),
  nullifierHash: varchar('nullifier_hash', { length: 66 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  exchangeIdIdx: index('accounts_exchange_id_idx').on(table.exchangeId),
  userIdIdx: index('accounts_user_id_idx').on(table.userId),
  hashedLeafIdx: index('accounts_hashed_leaf_idx').on(table.hashedLeaf),
  nullifierHashIdx: index('accounts_nullifier_hash_idx').on(table.nullifierHash),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
