import { pgTable, varchar, timestamp, integer, index, text } from 'drizzle-orm/pg-core';

export const merkleNodes = pgTable('merkle_nodes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  roundId: varchar('round_id', { length: 36 }).notNull(),
  index: integer('index').notNull(),
  level: integer('level').notNull(),
  hash: varchar('hash', { length: 66 }).notNull(),
  isRoot: varchar('is_root', { length: 1 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  roundIdIdx: index('merkle_nodes_round_id_idx').on(table.roundId),
  levelIdx: index('merkle_nodes_level_idx').on(table.level),
  hashIdx: index('merkle_nodes_hash_idx').on(table.hash),
}));

export type MerkleNode = typeof merkleNodes.$inferSelect;
export type NewMerkleNode = typeof merkleNodes.$inferInsert;
