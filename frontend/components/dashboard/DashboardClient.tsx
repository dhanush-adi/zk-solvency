'use client';

import { motion } from 'framer-motion';
import { Loader2, TrendingUp } from 'lucide-react';
import { useLiveProof } from '@/hooks/useLiveProof';
import { useSolvencyHistory } from '@/hooks/useSolvencyHistory';
import { HashDisplay } from '@/components/HashDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { ProofCountdown } from '@/components/ProofCountdown';
import { SolvencyRatioGauge } from '@/components/SolvencyRatioGauge';
import { CountUpNumber } from '@/components/CountUpNumber';
import Link from 'next/link';

export function DashboardClient() {
  const { proof, isLoading, error } = useLiveProof();
  const { history, stats, isLoading: historyLoading } = useSolvencyHistory({ days: 7 });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-muted-foreground">Loading proof of reserves...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-lg bg-destructive/20 border border-destructive/50 p-6">
          <p className="text-destructive font-medium">Error loading proof: {error}</p>
          <p className="text-destructive/80 text-sm mt-2">Please try again later or check your connection.</p>
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

  const solvencyRatio = Math.random() * 0.3 + 0.95; // Mock: 95-125% solvency
  const mockAssets = '$1,234,567,890';
  const mockLiabilities = '$1,100,000,000';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Proof of Reserves</h1>
            <p className="text-muted-foreground max-w-2xl">
              Real-time cryptographic verification of institutional solvency with zero-knowledge proofs.
            </p>
          </div>
          <StatusBadge status={proof.status === 'verified' ? 'verified' : 'generating'} />
        </div>
      </motion.section>

      {/* Main Metrics Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        {/* Current Solvency */}
        <motion.div
          className="rounded-lg bg-card border border-border p-6"
          whileHover={{ translateY: -4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Current Proof</span>
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-3xl font-bold text-foreground">
              <CountUpNumber value={solvencyRatio * 100} decimals={1} suffix="%" />
            </p>
            <p className="text-xs text-muted-foreground">Solvency Ratio</p>
          </div>
        </motion.div>

        {/* Total Balance */}
        <motion.div
          className="rounded-lg bg-card border border-border p-6"
          whileHover={{ translateY: -4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Total Balance</span>
            <div className="w-3 h-3 rounded-full bg-accent" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-3xl font-bold font-mono text-accent">{proof.totalBalance}</p>
            <p className="text-xs text-muted-foreground">On-chain verified</p>
          </div>
        </motion.div>

        {/* Proof Status */}
        <motion.div
          className="rounded-lg bg-card border border-border p-6"
          whileHover={{ translateY: -4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
          </div>
          <div className="flex flex-col gap-4">
            <StatusBadge
              status={proof.status === 'verified' ? 'verified' : 'generating'}
              label={proof.status === 'verified' ? 'Verified' : 'Generating'}
            />
            <ProofCountdown
              isGenerating={proof.status !== 'verified'}
              expiresAt={proof.expiresAt}
              className="text-xs"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Detailed Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
      >
        {/* Solvency Ratio Gauge */}
        <div className="rounded-lg bg-card border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Solvency Ratio</h2>
          <SolvencyRatioGauge
            ratio={solvencyRatio}
            assets={mockAssets}
            liabilities={mockLiabilities}
          />
        </div>

        {/* Proof Details */}
        <div className="rounded-lg bg-card border border-border p-6 flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-foreground">Proof Details</h2>

          <HashDisplay
            label="Merkle Root"
            hash={proof.merkleRoot}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Block Height</p>
              <p className="text-lg font-mono text-secondary">{proof.blockHeight}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Chain ID</p>
              <p className="text-lg font-mono text-secondary">{proof.chainId}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-2">Generated</p>
              <p className="text-sm text-foreground">{new Date(proof.generatedAt).toLocaleString()}</p>
            </div>
          </div>

          <Link
            href="/proof-details"
            className="inline-block px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors text-center text-sm"
          >
            View Full Details
          </Link>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-lg bg-card border border-border p-8 text-center"
      >
        <h2 className="text-2xl font-bold text-foreground mb-4">Verify Inclusion</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Check if a specific wallet is included in the proof of reserves with our inclusion checker.
        </p>
        <Link
          href="/inclusion-checker"
          className="inline-block px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors"
        >
          Check Wallet Inclusion
        </Link>
      </motion.section>
    </div>
  );
}
