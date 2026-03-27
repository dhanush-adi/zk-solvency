'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProofCountdownProps {
  isGenerating: boolean;
  expiresAt?: Date;
  className?: string;
}

export function ProofCountdown({
  isGenerating,
  expiresAt,
  className,
}: ProofCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expireTime = new Date(expiresAt).getTime();
      const diff = expireTime - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (isGenerating) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-secondary', className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Generating proof...
      </div>
    );
  }

  if (!expiresAt) {
    return null;
  }

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      Expires in: <span className="text-foreground font-mono font-medium">{timeLeft}</span>
    </div>
  );
}
