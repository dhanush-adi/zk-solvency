'use client';

import { motion } from 'framer-motion';
import { Shield, ArrowRight, Activity, Lock } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
      {/* Background grid pattern - Aceternity inspired */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] z-0 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold mb-6 tracking-wider uppercase"
          >
            <Activity className="w-3 h-3" />
            Live Solvency Verification
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold text-foreground mb-6 tracking-tight"
          >
            Institutional Trust, <br />
            <span className="bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent">
              Cryptographically Proven.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-muted-foreground mb-10 leading-relaxed"
          >
            Real-time, privacy-preserving proof of reserves. We ensure exchanges remain solvent using 
            zero-knowledge proofs and zkTLS data attestation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/inclusion-checker"
              className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40"
            >
              Check Your Balance
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="flex items-center gap-2 px-8 py-4 rounded-xl bg-card border border-border text-foreground font-bold hover:bg-accent/5 transition-all">
              <Shield className="w-4 h-4 text-accent" />
              View Protocol Specs
            </button>
          </motion.div>

          {/* Value props - subtle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-16 pt-16 border-t border-border/50 grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                <Lock className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground">Zero Leakage</h3>
              <p className="text-sm text-muted-foreground">User data never leaves the exchange backend.</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground">Real-time Proofs</h3>
              <p className="text-sm text-muted-foreground">Periodic STARK proofs committed on StarkNet.</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground">zkTLS Verified</h3>
              <p className="text-sm text-muted-foreground">Certified data fetching prevents manipulation.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
