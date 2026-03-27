'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useSolvencyStore } from '@/store/solvencyStore';
import { ProofOfReserves } from '@/lib/types';

export function SSEProvider({ children }: { children: ReactNode }) {
  const { setCurrentProof, addProofToHistory } = useSolvencyStore();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [sseEnabled, setSseEnabled] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    // Skip SSE if no API URL is configured
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setConnectionStatus('disconnected');
      setSseEnabled(false);
      return;
    }

    setSseEnabled(true);
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(`${apiUrl}/api/proof/stream`);

        eventSource.onopen = () => {
          setConnectionStatus('connected');
          setRetryCount(0);
          console.log('[SSE] Connected to proof stream');
        };

        eventSource.onmessage = (event) => {
          try {
            const proof: ProofOfReserves = JSON.parse(event.data);
            setCurrentProof(proof);
            addProofToHistory(proof);
            console.log('[SSE] Received new proof:', proof.id);

            // Flash animation on new proof
            const flash = document.createElement('div');
            flash.className = 'fixed inset-0 pointer-events-none bg-accent/10 animate-pulse';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 300);
          } catch (err) {
            console.error('[SSE] Failed to parse message:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource?.readyState === EventSource.CLOSED) {
            setConnectionStatus('disconnected');
            eventSource = null;
            
            // Retry connection with exponential backoff
            if (retryCount < maxRetries) {
              const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
              console.log(`[SSE] Retrying connection in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
              setRetryCount(prev => prev + 1);
              reconnectTimeout = setTimeout(connectSSE, backoffDelay);
            } else {
              setConnectionStatus('error');
              console.log('[SSE] Max retries reached, SSE disabled');
            }
          }
        };
      } catch (error) {
        console.error('[SSE] Failed to create EventSource:', error);
        setConnectionStatus('error');
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      setConnectionStatus('disconnected');
    };
  }, [setCurrentProof, addProofToHistory, retryCount]);

  return (
    <>
      {children}
      {/* SSE Status Indicator - Only show if SSE is enabled and has errors */}
      {sseEnabled && connectionStatus === 'error' && (
        <div className="fixed bottom-4 left-4 rounded-lg bg-destructive/20 border border-destructive/50 px-4 py-2 flex items-center gap-2 text-destructive text-sm z-50">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          SSE connection unavailable - using demo data
        </div>
      )}
    </>
  );
}
