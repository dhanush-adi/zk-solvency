import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSolvencyStore } from '@/store/solvencyStore';
import { SolvencyHistoryEntry } from '@/lib/types';
import { generateMockSolvencyHistory } from '@/lib/mockData';

interface SolvencyHistoryParams {
  days?: number;
  limit?: number;
}

export function useSolvencyHistory(params: SolvencyHistoryParams = {}) {
  const { addSolvencyHistoryEntry, solvencyHistory } = useSolvencyStore();
  const { days = 30, limit = 100 } = params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const { data, isLoading, error } = useQuery({
    queryKey: ['solvencyHistory', days, limit],
    queryFn: async (): Promise<SolvencyHistoryEntry[]> => {
      // Use mock data if no API URL is configured
      if (!apiUrl) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return generateMockSolvencyHistory(days);
      }

      try {
        const queryParams = new URLSearchParams({
          days: days.toString(),
          limit: limit.toString(),
        });

        const response = await fetch(
          `${apiUrl}/api/solvency/history?${queryParams}`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch solvency history');
        }

        return response.json();
      } catch (err) {
        console.error('[useSolvencyHistory] API error, using mock data:', err);
        // Fallback to mock data on error
        return generateMockSolvencyHistory(days);
      }
    },
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 120000,
    retry: 1,
  });

  // Add new entries to store as they arrive
  useEffect(() => {
    if (data) {
      data.forEach((entry) => {
        if (!solvencyHistory.some((h) => h.timestamp === entry.timestamp)) {
          addSolvencyHistoryEntry(entry);
        }
      });
    }
  }, [data, solvencyHistory, addSolvencyHistoryEntry]);

  // Calculate statistics
  const stats = {
    current: data?.[0],
    average: data
      ? data.reduce((sum, entry) => sum + entry.solvencyRatio, 0) / data.length
      : 0,
    min: data ? Math.min(...data.map((e) => e.solvencyRatio)) : 0,
    max: data ? Math.max(...data.map((e) => e.solvencyRatio)) : 0,
  };

  return {
    history: data || [],
    isLoading,
    error,
    stats,
  };
}
