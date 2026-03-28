CREATE TABLE IF NOT EXISTS "accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"exchange_id" varchar(36) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"balance" numeric(78, 0) NOT NULL,
	"balance_encrypted" text,
	"hashed_leaf" varchar(66) NOT NULL,
	"nullifier_hash" varchar(66),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "merkle_nodes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"round_id" varchar(36) NOT NULL,
	"index" integer NOT NULL,
	"level" integer NOT NULL,
	"hash" varchar(66) NOT NULL,
	"is_root" varchar(1) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nullifiers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"nullifier_hash" varchar(66) NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"round_id" varchar(36) NOT NULL,
	"on_chain_confirmed" varchar(1) DEFAULT '0',
	"tx_hash" varchar(66),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proof_rounds" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"round_number" integer NOT NULL,
	"merkle_root" varchar(66) NOT NULL,
	"total_assets" numeric(78, 0) NOT NULL,
	"total_liabilities" numeric(78, 0) NOT NULL,
	"stark_proof_cid" text,
	"chain_tx_hash" varchar(66),
	"previous_round_hash" varchar(66),
	"cycle_id" integer,
	"nullifier_count" integer,
	"proof_data" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp,
	CONSTRAINT "proof_rounds_round_number_unique" UNIQUE("round_number")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_exchange_id_idx" ON "accounts" ("exchange_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_hashed_leaf_idx" ON "accounts" ("hashed_leaf");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_nullifier_hash_idx" ON "accounts" ("nullifier_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merkle_nodes_round_id_idx" ON "merkle_nodes" ("round_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merkle_nodes_level_idx" ON "merkle_nodes" ("level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merkle_nodes_hash_idx" ON "merkle_nodes" ("hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nullifiers_hash_idx" ON "nullifiers" ("nullifier_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nullifiers_account_id_idx" ON "nullifiers" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nullifiers_round_id_idx" ON "nullifiers" ("round_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nullifiers_tx_hash_idx" ON "nullifiers" ("tx_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nullifiers_unique_round_account" ON "nullifiers" ("round_id","account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proof_rounds_round_number_idx" ON "proof_rounds" ("round_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proof_rounds_merkle_root_idx" ON "proof_rounds" ("merkle_root");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proof_rounds_status_idx" ON "proof_rounds" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proof_rounds_chain_tx_hash_idx" ON "proof_rounds" ("chain_tx_hash");