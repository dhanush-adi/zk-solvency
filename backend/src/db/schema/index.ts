import { accounts, type Account, type NewAccount } from './accounts';
import { merkleNodes, type MerkleNode, type NewMerkleNode } from './merkle_nodes';
import { proofRounds, type ProofRound, type NewProofRound } from './proof_rounds';
import { nullifiers, type Nullifier, type NewNullifier } from './nullifiers';

export { accounts, type Account, type NewAccount };
export { merkleNodes, type MerkleNode, type NewMerkleNode };
export { proofRounds, type ProofRound, type NewProofRound };
export { nullifiers, type Nullifier, type NewNullifier };

export type DbSchema = {
  accounts: typeof accounts;
  merkleNodes: typeof merkleNodes;
  proofRounds: typeof proofRounds;
  nullifiers: typeof nullifiers;
};