import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSolvencyStore } from '@/store/solvencyStore';
import { InclusionProof } from '@/lib/types';

// DEMO MODE: Set to true to use mock data for screenshots/recordings
const DEMO_MODE = false;

// Generate a mock inclusion proof for demo purposes
function generateMockInclusionProof(userId: string): InclusionProof {
  const leafHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  
  // Generate 8-level Merkle path (simulating ~256 accounts)
  const siblings = Array.from({ length: 8 }, () => 
    `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
  );
  
  const pathIndices = Array.from({ length: 8 }, () => Math.round(Math.random()));
  
  return {
    id: `inclusion-${Date.now()}`,
    wallet: `0x${userId.replace('user_', '')}a1b2c3d4e5f6789012345678901234567890`,
    userId,
    balance: (Math.floor(Math.random() * 50000) + 1000).toString(),
    merkleProof: {
      leaf: leafHash,
      siblings,
      pathIndices,
    },
    merkleRoot: '0x7a3b9c4d8e1f2a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    leafIndex: parseInt(userId.replace('user_', '')) || 0,
    verified: true,
    proofOfReservesId: 'proof-2026-03-29-001',
  };
}

interface VerifyInclusionParams {
  userId: string;
  signature: string;
}

export function useInclusionProof() {
  const { setCurrentInclusionProof, addCheckedWallet, setIsVerifying } = useSolvencyStore();
  const [error, setError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const verifyMutation = useMutation({
    mutationFn: async (params: VerifyInclusionParams) => {
      setIsVerifying(true);
      try {
        // DEMO MODE: Return mock data after a short delay
        if (DEMO_MODE) {
          await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
          return generateMockInclusionProof(params.userId);
        }

        if (!apiUrl) {
          throw new Error('API URL not configured');
        }

        const response = await fetch(`${apiUrl}/api/inclusion-proof/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Verification failed (${response.status})`);
        }

        return response.json() as Promise<InclusionProof>;
      } finally {
        setIsVerifying(false);
      }
    },
    onSuccess: (proof) => {
      setCurrentInclusionProof(proof);
      const walletKey = proof.wallet || proof.userId || 'unknown';
      addCheckedWallet(walletKey, proof);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const getProofHistory = useQuery({
    queryKey: ['inclusionProofHistory'],
    queryFn: async () => {
      if (!apiUrl) return [];
      try {
        const response = await fetch(`${apiUrl}/api/inclusion-proof/history`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return [];
        return response.json() as Promise<InclusionProof[]>;
      } catch (err) {
        return [];
      }
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const verifyInclusion = useCallback(
    (userId: string, proofOfReservesId: string) => {
      setError(null);
      return verifyMutation.mutate({ userId, signature: 'demo' });
    },
    [verifyMutation]
  );

  return {
    verifyInclusion,
    isVerifying: verifyMutation.isPending,
    proof: verifyMutation.data,
    error,
    history: getProofHistory.data || [],
  };
}
