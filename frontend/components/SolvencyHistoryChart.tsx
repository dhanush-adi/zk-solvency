'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface HistoryEntry {
  timestamp: string | number;
  solvencyRatio: number;
}

interface SolvencyHistoryChartProps {
  data: HistoryEntry[];
}

export function SolvencyHistoryChart({ data }: SolvencyHistoryChartProps) {
  // Transform data for the chart if necessary
  const chartData = data.map(entry => ({
    time: new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    ratio: entry.solvencyRatio * 100,
  }));

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRatio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            hide 
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--card)', 
              borderColor: 'var(--border)', 
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }} 
            itemStyle={{ color: 'var(--accent)' }}
          />
          <Area 
            type="monotone" 
            dataKey="ratio" 
            stroke="var(--accent)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRatio)" 
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
