import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSolvencyStore } from '@/store/solvencyStore';
import { SolvencyHistoryEntry } from '@/lib/types';

// DEMO MODE: Set to true to use mock data for screenshots/recordings
const DEMO_MODE = false;

// Generate mock history data for the past 7 days
function generateMockHistory(): SolvencyHistoryEntry[] {
  const now = Date.now();
  const history: SolvencyHistoryEntry[] = [];
  
  // Generate 24 data points (every 7 hours for past week)
  for (let i = 0; i < 24; i++) {
    const timestamp = now - (i * 7 * 60 * 60 * 1000); // 7 hours apart
    const baseRatio = 1.021;
    // Add some realistic variation
    const variation = (Math.sin(i * 0.5) * 0.005) + (Math.random() * 0.004 - 0.002);
    const solvencyRatio = baseRatio + variation;
    
    const baseLiabilities = 743218956;
    const liabilityVariation = Math.floor(Math.random() * 5000000) - 2500000;
    const totalLiabilities = (baseLiabilities + liabilityVariation).toString();
    const totalAssets = Math.floor((baseLiabilities + liabilityVariation) * solvencyRatio).toString();
    
    history.push({
      timestamp,
      solvencyRatio: parseFloat(solvencyRatio.toFixed(4)),
      totalAssets,
      totalLiabilities,
      proofHash: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
    });
  }
  
  return history.reverse(); // Oldest first for charting
}

const MOCK_HISTORY = generateMockHistory();

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
      // DEMO MODE: Return mock data immediately
      if (DEMO_MODE) {
        return MOCK_HISTORY;
      }

      if (!apiUrl) {
        return [];
      }

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
    },
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 120000,
    retry: 2,
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
