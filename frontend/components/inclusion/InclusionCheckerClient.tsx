'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useInclusionProof } from '@/hooks/useInclusionProof';
import { useLiveProof } from '@/hooks/useLiveProof';
import { StatusBadge } from '@/components/StatusBadge';
import { HashDisplay } from '@/components/HashDisplay';
import { MerklePathVisualizer } from '@/components/MerklePathVisualizer';

const walletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

type WalletFormData = z.infer<typeof walletSchema>;

export function InclusionCheckerClient() {
  const { proof } = useLiveProof();
  const { verifyInclusion, isVerifying, proof: inclusionProof, error } = useInclusionProof();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<WalletFormData>({
    resolver: zodResolver(walletSchema),
  });

  const walletAddress = watch('walletAddress');

  const onSubmit = async (data: WalletFormData) => {
    if (!proof) return;
    setSubmitted(true);
    verifyInclusion(data.walletAddress, proof.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-bold text-foreground mb-2">Inclusion Checker</h1>
        <p className="text-muted-foreground max-w-2xl">
          Verify that your wallet is included in the current proof of reserves and view your merkle proof path.
        </p>
      </motion.section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-lg bg-card border border-border p-8"
        >
          <h2 className="text-xl font-semibold text-foreground mb-6">Check Your Wallet</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="wallet" className="block text-sm font-medium text-foreground mb-2">
                Wallet Address
              </label>
              <input
                id="wallet"
                type="text"
                placeholder="0x1234567890123456789012345678901234567890"
                {...register('walletAddress')}
                className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-ring"
              />
              {errors.walletAddress && (
                <p className="text-destructive text-sm mt-2">{errors.walletAddress.message}</p>
              )}
            </div>

            {proof && (
              <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Current Proof</p>
                <p className="text-sm font-mono text-secondary">{proof.merkleRoot.slice(0, 16)}...</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !proof}
              className="w-full px-4 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Inclusion'
              )}
            </button>
          </form>

          {/* Results */}
          {submitted && inclusionProof && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-4"
            >
              <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/20 border border-accent/30">
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                <div>
                  <p className="font-semibold text-accent">Wallet Verified</p>
                  <p className="text-sm text-accent/80">This wallet is included in the proof of reserves.</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-3">Balance</p>
                <p className="text-2xl font-mono text-secondary">{inclusionProof.balance}</p>
              </div>

              <HashDisplay
                label="Leaf Hash"
                hash={inclusionProof.merkleRoot}
              />
            </motion.div>
          )}

          {submitted && error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 rounded-lg bg-destructive/20 border border-destructive/30 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Verification Failed</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Visualization */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-lg bg-card border border-border p-8 flex flex-col"
        >
          <h2 className="text-xl font-semibold text-foreground mb-6">Merkle Path</h2>

          {inclusionProof && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <MerklePathVisualizer
                merkleProof={inclusionProof.merkleProof}
                leafHash={inclusionProof.merkleRoot}
                merkleRoot={proof?.merkleRoot || ''}
              />
            </motion.div>
          )}

          {!submitted && (
            <div className="flex items-center justify-center h-96 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-muted border-t-accent rounded-full animate-spin" />
                </div>
                <p className="text-muted-foreground text-sm">Enter your wallet address to view the merkle path</p>
              </div>
            </div>
          )}

          {submitted && !inclusionProof && !isVerifying && (
            <div className="flex items-center justify-center h-96">
              <p className="text-destructive text-center">Unable to verify. Please try again.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
