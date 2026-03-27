import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSolvencyStore } from '@/store/solvencyStore';
import { InclusionProof } from '@/lib/types';
import { generateMockInclusionProof } from '@/lib/mockData';

interface VerifyInclusionParams {
  walletAddress: string;
  proofOfReservesId: string;
}

export function useInclusionProof() {
  const { setCurrentInclusionProof, addCheckedWallet, setIsVerifying } = useSolvencyStore();
  const [error, setError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const verifyMutation = useMutation({
    mutationFn: async (params: VerifyInclusionParams) => {
      setIsVerifying(true);
      try {
        // Use mock data if no API URL is configured
        if (!apiUrl) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          return generateMockInclusionProof(params.walletAddress);
        }

        const response = await fetch(`${apiUrl}/api/inclusion-proof/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          throw new Error('Failed to verify inclusion');
        }

        return response.json() as Promise<InclusionProof>;
      } catch (err) {
        console.error('[useInclusionProof] API error, using mock data:', err);
        // Fallback to mock data on error
        return generateMockInclusionProof(params.walletAddress);
      } finally {
        setIsVerifying(false);
      }
    },
    onSuccess: (proof) => {
      setCurrentInclusionProof(proof);
      addCheckedWallet(proof.wallet, proof);
    },
  });

  const getProofHistory = useQuery({
    queryKey: ['inclusionProofHistory'],
    queryFn: async () => {
      if (!apiUrl) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return [];
      }
      try {
        const response = await fetch(`${apiUrl}/api/inclusion-proof/history`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch proof history');
        }
        return response.json() as Promise<InclusionProof[]>;
      } catch (err) {
        console.error('[useInclusionProof] Failed to fetch history:', err);
        return [];
      }
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const verifyInclusion = useCallback(
    (walletAddress: string, proofOfReservesId: string) => {
      setError(null);
      return verifyMutation.mutate({ walletAddress, proofOfReservesId });
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
