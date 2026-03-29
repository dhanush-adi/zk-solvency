'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, AlertCircle, Search, ShieldCheck, Fingerprint } from 'lucide-react';
import { useInclusionProof } from '@/hooks/useInclusionProof';
import { useLiveProof } from '@/hooks/useLiveProof';
import { StatusBadge } from '@/components/StatusBadge';
import { HashDisplay } from '@/components/HashDisplay';
import { MerklePathVisualizer } from '@/components/MerklePathVisualizer';
import { cn } from '@/lib/utils';

const walletSchema = z.object({
  userId: z.string().min(1, 'User ID is required (e.g. user_0, user_5)'),
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

  const onSubmit = async (data: WalletFormData) => {
    if (!proof) return;
    setSubmitted(true);
    verifyInclusion(data.userId, proof.id);
  };

  return (
    <div className="relative min-h-screen pb-20">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-accent/5 to-transparent -z-10" />
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-accent/5 blur-[120px] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold mb-4 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            Proof of Inclusion
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground mb-4 tracking-tight">
            Verify Your <span className="text-accent italic">Reserves.</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Ensure your account was correctly hashed into the Merkle tree. Our ZK-Proof system guarantees 
            your balance was included in the latest solvency commitment.
          </p>
        </motion.section>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Form & Results */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 space-y-8"
          >
            <div className="group relative rounded-3xl bg-card border border-border/50 p-8 shadow-2xl shadow-accent/5 overflow-hidden transition-all hover:border-accent/30">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <h2 className="text-xl font-black text-foreground mb-8 flex items-center gap-3">
                  <Fingerprint className="w-6 h-6 text-accent" />
                  Account Verification
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  <div className="space-y-3">
                    <label htmlFor="userId" className="block text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
                      Account User ID
                    </label>
                    <div className="relative group/input">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-accent transition-colors">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        id="userId"
                        type="text"
                        placeholder="user_0"
                        {...register('userId')}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-accent/5 border border-border/50 text-foreground font-mono text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
                      />
                    </div>
                    {errors.userId && (
                      <p className="text-destructive text-xs font-bold px-1 mt-2 animate-pulse">{errors.userId.message}</p>
                    )}
                  </div>

                  {proof && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-accent/10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Active Root Commitment</span>
                        <code className="text-xs font-bold text-accent">{proof.merkleRoot.slice(0, 18)}...</code>
                      </div>
                      <StatusBadge status="verified" label="On-Chain" />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying || !proof}
                    className="group relative w-full px-4 py-5 rounded-2xl bg-accent text-accent-foreground font-black uppercase tracking-tighter hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-accent/20"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Hashing Path...
                        </>
                      ) : (
                        <>
                          Verify Inclusion
                          <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </>
                      )}
                    </div>
                  </button>
                </form>

                {/* Results Section */}
                <AnimatePresence mode="wait">
                  {submitted && inclusionProof && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-12 space-y-6 pt-8 border-t border-border/50"
                    >
                      <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-black text-emerald-500 uppercase tracking-tight text-sm">Verification Successful</p>
                          <p className="text-xs text-emerald-500/80 font-medium">Cryptographically matched with Root.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-accent/5 border border-border/50">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">User ID Match</p>
                          <p className="text-xl font-black text-foreground font-mono tracking-tighter italic">{inclusionProof.userId}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-accent/5 border border-border/50">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Path Depth</p>
                          <p className="text-xl font-black text-foreground font-mono tracking-tighter italic">{inclusionProof.merkleProof.siblings.length || 0} levels</p>
                        </div>
                      </div>

                      <HashDisplay
                        label="Account Leaf Hash (h(v, n))"
                        hash={inclusionProof.merkleRoot}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {submitted && error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <p className="font-black text-destructive uppercase tracking-tight text-sm">Inclusion Mismatch</p>
                      <p className="text-xs text-destructive/80 font-medium mt-1">{error}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7"
          >
            <div className="h-full rounded-3xl bg-card border border-border/50 p-8 shadow-2xl shadow-accent/5 flex flex-col relative overflow-hidden group">
              {/* Grid backdrop for viz */}
              <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(#808080_1px,transparent_1px)] bg-[size:20px_20px]" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-foreground">Merkle Path Visualizer</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Real-time mapping</span>
                  </div>
                </div>

                <div className="flex-1 min-h-[500px] flex flex-col">
                  {inclusionProof ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1 }}
                      className="flex-1"
                    >
                      <MerklePathVisualizer
                        merkleProof={inclusionProof.merkleProof.siblings}
                        leafHash={inclusionProof.merkleProof.leaf}
                        merkleRoot={proof?.merkleRoot || ''}
                      />
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full" />
                        <div className="relative w-24 h-24 rounded-3xl bg-accent/10 border-2 border-accent/20 flex items-center justify-center overflow-hidden">
                          <motion.div
                            animate={{ 
                              y: [0, -20, 0, 20, 0],
                              scale: [1, 1.1, 1, 0.9, 1] 
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                          >
                            <ShieldCheck className="w-12 h-12 text-accent/40" />
                          </motion.div>
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-accent/30 overflow-hidden">
                            <motion.div 
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="h-full w-full bg-accent shadow-[0_0_10px_#00ff87]"
                            />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-foreground mb-3 uppercase tracking-tight">Waiting for Wallet Entry</h3>
                      <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
                        Input your address to view the cryptographic path to the root.
                      </p>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="mt-8 pt-8 border-t border-border/50 grid grid-cols-2 sm:flex sm:items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-lg bg-accent" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Selected Proof Path</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-lg border-2 border-border/50" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Commitment Logic</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 ml-auto">
                    <div className="flex -space-x-1.5">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full bg-accent/20 border border-background flex items-center justify-center text-[8px] font-black text-accent">{i}</div>
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic opacity-50 underline decoration-accent/30 decoration-2">L3/L4 Protocol Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
