'use client';

import { motion } from 'framer-motion';
import { Loader2, Download, Share2 } from 'lucide-react';
import { useLiveProof } from '@/hooks/useLiveProof';
import { useSolvencyHistory } from '@/hooks/useSolvencyHistory';
import { HashDisplay } from '@/components/HashDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { CountUpNumber } from '@/components/CountUpNumber';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ProofDetailsClient() {
  const { proof, isLoading } = useLiveProof();
  const { history } = useSolvencyHistory({ days: 30 });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-muted-foreground">Loading proof details...</p>
        </div>
      </div>
    );
  }

  if (!proof) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">No Proof Available</h1>
          <p className="text-muted-foreground">The first proof of reserves will be generated soon.</p>
        </div>
      </div>
    );
  }

  // Format chart data
  const chartData = history.map((entry) => ({
    timestamp: new Date(entry.timestamp).toLocaleDateString(),
    solvency: Math.round(entry.solvencyRatio * 100),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Proof Details</h1>
            <p className="text-muted-foreground">Complete cryptographic verification data</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-colors" title="Download proof">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-colors" title="Share proof">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.section>

      {/* Status Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="rounded-lg bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground mb-2">Status</p>
          <StatusBadge status={proof.status === 'verified' ? 'verified' : 'generating'} />
        </div>

        <div className="rounded-lg bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground mb-2">Block Height</p>
          <p className="text-lg font-mono text-secondary">
            <CountUpNumber value={proof.blockHeight} />
          </p>
        </div>

        <div className="rounded-lg bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground mb-2">Chain ID</p>
          <p className="text-lg font-mono text-secondary">
            <CountUpNumber value={proof.chainId} />
          </p>
        </div>

        <div className="rounded-lg bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground mb-2">Total Balance</p>
          <p className="text-sm font-mono text-accent truncate">{proof.totalBalance}</p>
        </div>
      </motion.div>

      {/* Hash Details */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg bg-card border border-border p-8 mb-8"
      >
        <h2 className="text-xl font-semibold text-foreground mb-6">Cryptographic Hashes</h2>

        <div className="space-y-4">
          <HashDisplay
            label="Merkle Root"
            hash={proof.merkleRoot}
            fullHash
          />

          <HashDisplay
            label="Proof ID"
            hash={proof.id}
            fullHash
          />
        </div>
      </motion.section>

      {/* Timeline */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-lg bg-card border border-border p-8 mb-8"
      >
        <h2 className="text-xl font-semibold text-foreground mb-6">Proof Timeline</h2>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-accent" />
              <div className="w-1 h-12 bg-gradient-to-b from-accent to-transparent" />
            </div>
            <div className="pb-12">
              <p className="font-semibold text-foreground">Generated</p>
              <p className="text-sm text-muted-foreground">{new Date(proof.generatedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-secondary" />
              <div className="w-1 h-12 bg-gradient-to-b from-secondary to-transparent" />
            </div>
            <div className="pb-12">
              <p className="font-semibold text-foreground">Expires</p>
              <p className="text-sm text-muted-foreground">{new Date(proof.expiresAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-muted" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Age</p>
              <p className="text-sm text-muted-foreground">
                {Math.floor((new Date().getTime() - new Date(proof.generatedAt).getTime()) / 1000 / 60)} minutes old
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Historical Chart */}
      {history.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg bg-card border border-border p-8"
        >
          <h2 className="text-xl font-semibold text-foreground mb-6">Solvency History</h2>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="timestamp" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
              <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                }}
                cursor={{ stroke: 'rgba(0, 255, 135, 0.5)' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="solvency"
                stroke="var(--accent)"
                strokeWidth={2}
                isAnimationActive={false}
                dot={{ fill: 'var(--accent)', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.section>
      )}
    </div>
  );
}
