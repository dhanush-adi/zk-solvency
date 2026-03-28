'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CountUpNumber } from './CountUpNumber';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  const uncoveredColor = 'rgba(255, 255, 255, 0.05)';

  const colors = [statusColor, uncoveredColor];

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <div className="relative h-48 w-full">
        {/* Central Glow */}
        <div 
          className="absolute inset-x-0 bottom-0 h-24 bg-accent/20 blur-[60px] rounded-full mx-auto w-32 -z-10" 
          style={{ backgroundColor: isHealthy ? 'rgba(0, 255, 135, 0.15)' : 'rgba(255, 144, 0, 0.15)' }}
        />

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="80%"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="100%"
              dataKey="value"
              stroke="none"
              paddingAngle={0}
              cornerRadius={12}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${entry.id}`} 
                  fill={colors[index]} 
                  className="transition-all duration-300"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text */}
        <div className="absolute inset-x-0 bottom-[15%] flex flex-col items-center justify-center">
          <motion.p 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl font-black text-foreground tracking-tighter italic"
          >
            <CountUpNumber
              value={safePercentage}
              decimals={1}
              suffix="%"
            />
          </motion.p>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 italic">
            Health Ratio
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-accent/5 border border-border/20 flex flex-col gap-1 overflow-hidden">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Assets</span>
          <span className="text-sm font-bold text-foreground font-mono truncate tracking-tight">{assets}</span>
        </div>
        <div className="p-4 rounded-2xl bg-accent/5 border border-border/20 flex flex-col gap-1 overflow-hidden">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Liabilities</span>
          <span className="text-sm font-bold text-foreground font-mono truncate tracking-tight">{liabilities}</span>
        </div>
      </div>

      <div className={cn(
        'px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-tight flex items-center justify-center gap-2 border',
        isHealthy 
          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
          : 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
      )}>
        {isHealthy ? 'Protocol is fully solvent' : 'Protocol undercollateralized'}
        <div className={cn("w-1.5 h-1.5 rounded-full", isHealthy ? "bg-emerald-500" : "bg-orange-500")} />
      </div>
    </div>
  );
}
