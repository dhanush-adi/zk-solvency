import { ProofOfReserves, InclusionProof, SolvencyHistoryEntry } from './types';

export function generateMockProof(): ProofOfReserves {
  const now = new Date();
  return {
    id: `proof-${Date.now()}`,
    merkleRoot: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    totalBalance: '$1,234,567,890',
    blockHeight: Math.floor(Math.random() * 19000000) + 1000000,
    chainId: 1,
    status: Math.random() > 0.3 ? 'verified' : 'generating',
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60000).toISOString(),
  };
}

export function generateMockInclusionProof(walletAddress: string): InclusionProof {
  const merkleProof = Array(6).fill(0).map(() =>
    '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
  );

  return {
    id: `inclusion-${Date.now()}`,
    wallet: walletAddress,
    included: Math.random() > 0.2,
    merkleProof,
    merkleRoot: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    proofIndex: Math.floor(Math.random() * 10000),
    leafHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    verifiedAt: new Date().toISOString(),
  };
}

export function generateMockSolvencyHistory(days: number = 7): SolvencyHistoryEntry[] {
  const entries: SolvencyHistoryEntry[] = [];
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    entries.push({
      timestamp: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
      solvencyRatio: 0.95 + Math.random() * 0.2,
      totalAssets: '$1,200,000,000',
      totalLiabilities: '$1,100,000,000',
      proofCount: Math.floor(Math.random() * 100) + 50,
    });
  }

  return entries;
}

export const mockProofData = generateMockProof();
export const mockInclusionData = generateMockInclusionProof('0x1234567890123456789012345678901234567890');
export const mockHistoryData = generateMockSolvencyHistory(7);
