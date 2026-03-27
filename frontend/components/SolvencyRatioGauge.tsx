'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CountUpNumber } from './CountUpNumber';
import { cn } from '@/lib/utils';

interface SolvencyRatioGaugeProps {
  ratio: number; // 0-1 or percentage
  assets: string;
  liabilities: string;
  className?: string;
}

export function SolvencyRatioGauge({
  ratio,
  assets,
  liabilities,
  className,
}: SolvencyRatioGaugeProps) {
  // Convert ratio to percentage if needed
  const percentage = ratio > 1 ? ratio : ratio * 100;
  const safePercentage = Math.min(Math.max(percentage, 0), 100);

  const data = [
    { name: 'Covered', value: safePercentage, id: 'covered' },
    { name: 'Uncovered', value: 100 - safePercentage, id: 'uncovered' },
  ];

  const isHealthy = safePercentage >= 100;
  const statusColor = isHealthy ? '#00ff87' : '#ff9000';
  const uncoveredColor = isHealthy ? '#2d3454' : '#ff4444';

  const colors = [statusColor, uncoveredColor];

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${entry.id}`} fill={colors[index] || '#666'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Solvency Ratio</span>
          <span className="text-2xl font-bold text-foreground">
            <CountUpNumber
              value={safePercentage}
              decimals={1}
              suffix="%"
            />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Assets</span>
          <span className="text-lg font-mono text-secondary truncate">{assets}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Liabilities</span>
          <span className="text-lg font-mono text-secondary truncate">{liabilities}</span>
        </div>
      </div>

      <div className={cn('px-4 py-2 rounded-lg text-sm', isHealthy ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive')}>
        {isHealthy ? '✓ Protocol is fully solvent' : '⚠ Warning: Undercollateralized'}
      </div>
    </div>
  );
}
