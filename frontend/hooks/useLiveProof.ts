import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSolvencyStore } from '@/store/solvencyStore';
import { ProofOfReserves } from '@/lib/types';
import { generateMockProof } from '@/lib/mockData';

export function useLiveProof() {
  const { setCurrentProof, addProofToHistory, setIsLoadingProof } = useSolvencyStore();
  const [error, setError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const { data: proof, isLoading, refetch } = useQuery({
    queryKey: ['liveProof'],
    queryFn: async (): Promise<ProofOfReserves> => {
      // Use mock data if no API URL is configured
      if (!apiUrl) {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate loading
        return generateMockProof();
      }

      try {
        const response = await fetch(`${apiUrl}/api/proof/latest`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch proof');
        }
        return response.json();
      } catch (err) {
        console.error('[useLiveProof] API error, falling back to mock data:', err);
        // Fallback to mock data on error
        return generateMockProof();
      }
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60000,
    retry: 1,
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
