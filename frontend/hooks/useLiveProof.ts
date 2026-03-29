import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSolvencyStore } from '@/store/solvencyStore';
import { ProofOfReserves } from '@/lib/types';

// DEMO MODE: Set to true to use mock data for screenshots/recordings
const DEMO_MODE = false;

const MOCK_PROOF: ProofOfReserves = {
  id: 'proof-2026-03-29-001',
  status: 'verified',
  merkleRoot: '0x7a3b9c4d8e1f2a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
  totalBalance: '$847,532,419',
  blockHeight: 847291,
  chainId: 1, // Ethereum mainnet
  timestamp: Date.now() - 300000, // 5 minutes ago
  generatedAt: new Date(Date.now() - 300000), // 5 minutes ago
  expiresAt: new Date(Date.now() + 3300000), // 55 minutes from now
};

export function useLiveProof() {
  const { setCurrentProof, addProofToHistory, setIsLoadingProof } = useSolvencyStore();
  const [error, setError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const { data: proof, isLoading, refetch } = useQuery({
    queryKey: ['liveProof'],
    queryFn: async (): Promise<ProofOfReserves | null> => {
      // DEMO MODE: Return mock data immediately
      if (DEMO_MODE) {
        return MOCK_PROOF;
      }

      if (!apiUrl) {
        throw new Error('API URL not configured. Set NEXT_PUBLIC_API_URL in .env.local');
      }

      const response = await fetch(`${apiUrl}/api/proof/latest`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 404) {
        // No proof rounds yet — not an error, just empty state
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch proof (${response.status})`);
      }

      return response.json();
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60000,
    retry: 2,
  });

  useEffect(() => {
    setIsLoadingProof(isLoading);
  }, [isLoading, setIsLoadingProof]);

  useEffect(() => {
    if (proof) {
      setCurrentProof(proof);
      addProofToHistory(proof);
    }
  }, [proof, setCurrentProof, addProofToHistory]);

  return {
    proof,
    isLoading,
    error,
    refetch,
  };
}
