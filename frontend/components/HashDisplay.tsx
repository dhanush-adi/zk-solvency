'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HashDisplayProps {
  hash: string;
  label?: string;
  className?: string;
  fullHash?: boolean;
}

export function HashDisplay({
  hash,
  label,
  className,
  fullHash = false,
}: HashDisplayProps) {
  const [copied, setCopied] = useState(false);

  const displayHash = fullHash ? hash : `${hash.slice(0, 16)}...${hash.slice(-16)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <div className="flex items-center justify-between gap-2 rounded-lg bg-card/50 px-3 py-2 border border-border">
        <code className="font-mono text-sm text-accent break-all">{displayHash}</code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1 hover:bg-border rounded transition-colors"
          title="Copy hash"
        >
          {copied ? (
            <Check className="w-4 h-4 text-accent" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
