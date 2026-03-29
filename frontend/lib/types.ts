// ZK-Solvency Data Types

export interface ProofOfReserves {
  id: string;
  timestamp: number;
  totalBalance: string; // BigNumber as string
  merkleRoot: string;
  blockHeight: number;
  chainId: number;
  status: 'pending' | 'verified' | 'failed';
  generatedAt: Date;
  expiresAt: Date;
}

export interface InclusionProof {
  id: string;
  wallet: string;
  userId?: string;
  balance: string;
  merkleProof: {
    leaf: string;
    siblings: string[];
    pathIndices: number[];
  };
  merkleRoot: string;
  leafIndex: number;
  verified: boolean;
  proofOfReservesId: string;
}

export interface AuditorAuditLog {
  id: string;
  auditorAddress: string;
  timestamp: number;
  walletVerifications: number;
  totalBalanceVerified: string;
  paymentAmount: string;
  paymentTxHash: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface SolvencyHistoryEntry {
  timestamp: number;
  solvencyRatio: number;
  totalAssets: string;
  totalLiabilities: string;
  proofHash: string;
}

export interface WalletBalance {
  address: string;
  balance: string;
  lastUpdated: number;
}

export interface MerkleNode {
  hash: string;
  isLeaf: boolean;
  level: number;
  leftChild?: MerkleNode;
  rightChild?: MerkleNode;
}

export interface ProofCountdownState {
  isGenerating: boolean;
  startTime?: number;
  expiresAt?: number;
  estimatedDuration: number; // milliseconds
}
