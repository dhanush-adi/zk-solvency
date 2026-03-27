'use client';

import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: 'verified' | 'pending' | 'failed' | 'generating';
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const statusConfig = {
    verified: {
      bg: 'bg-accent/20',
      text: 'text-accent',
      icon: CheckCircle,
      defaultLabel: 'Verified',
    },
    pending: {
      bg: 'bg-secondary/20',
      text: 'text-secondary',
      icon: Clock,
      defaultLabel: 'Pending',
    },
    failed: {
      bg: 'bg-destructive/20',
      text: 'text-destructive',
      icon: AlertCircle,
      defaultLabel: 'Failed',
    },
    generating: {
      bg: 'bg-secondary/20',
      text: 'text-secondary',
      icon: Loader2,
      defaultLabel: 'Generating',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium', config.bg, config.text, className)}>
      <Icon className={cn('w-4 h-4', status === 'generating' && 'animate-spin')} />
      {displayLabel}
    </div>
  );
}
