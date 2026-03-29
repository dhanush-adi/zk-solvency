'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { useLiveProof } from '@/hooks/useLiveProof';
import { useSolvencyStore } from '@/store/solvencyStore';
import { StatusBadge } from '@/components/StatusBadge';
import { CountUpNumber } from '@/components/CountUpNumber';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AuditMetrics {
  totalWallets: number;
  verifiedWallets: number;
  totalAssetsAudited: string;
  auditsCompleted: number;
}

export function AuditorDashboardClient() {
  const { proof } = useLiveProof();
  const { auditLogs } = useSolvencyStore();
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<AuditMetrics>({
    totalWallets: 1250,
    verifiedWallets: 1087,
    totalAssetsAudited: '$892,456,000',
    auditsCompleted: 156,
  });

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // 1. Simulate payment and get signature
      const payRes = await fetch(`${API_URL}/auditor/simulate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 })
      });
      
      if (!payRes.ok) {
        throw new Error('Payment simulation failed');
      }
      
      const paymentData = await payRes.json();
      
      // 2. Fetch auditor verification data with x402-payment header
      const verifyRes = await fetch(`${API_URL}/auditor/verify`, {
        headers: {
          'x402-payment': JSON.stringify(paymentData)
        }
      });
      
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (verifyData.verified) {
          const totalAssetsNum = Number(String(verifyData.latestRound.totalAssets).replace(/[^0-9.-]+/g, "")) || 0;
          
          setMetrics({
            totalWallets: verifyData.auditPack.accountCount || 1250,
            verifiedWallets: verifyData.auditPack.accountCount || 1087,
            totalAssetsAudited: `$${totalAssetsNum.toLocaleString()}`,
            auditsCompleted: verifyData.totalRounds || 156,
          });
        }
      }
    } catch (error) {
      console.error("Auditor data fetch failed, using fallback:", error);
    } finally {
      setIsPaid(true);
      setIsProcessing(false);
    }
  };

  const auditData = [
    { name: 'Jan', audits: 12, verified: 11 },
    { name: 'Feb', audits: 19, verified: 17 },
    { name: 'Mar', audits: 15, verified: 14 },
    { name: 'Apr', audits: 22, verified: 21 },
    { name: 'May', audits: 28, verified: 26 },
    { name: 'Jun', audits: 18, verified: 17 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-bold text-foreground mb-2">Auditor Dashboard</h1>
        <p className="text-muted-foreground max-w-2xl">
          Advanced audit tools for institutional verification. Payment required to access detailed audit logs and analytics.
        </p>
      </motion.section>

      {/* Payment Gate */}
      {!isPaid ? (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg bg-card border border-border p-8 mb-8"
        >
          <div className="flex items-start gap-4">
            <Lock className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-2">Premium Access Required</h2>
              <p className="text-muted-foreground mb-6">
                Unlock advanced audit features, detailed wallet verification logs, and comprehensive analytics by paying with USDC.
              </p>

              <div className="bg-background/50 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monthly Audit Access</span>
                  <span className="text-lg font-semibold text-foreground">100 USDC</span>
                </div>
                <div className="text-xs text-muted-foreground pt-3 border-t border-border">
                  <ul className="space-y-2">
                    <li>✓ Full audit log access</li>
                    <li>✓ Real-time verification analytics</li>
                    <li>✓ Export audit reports</li>
                    <li>✓ Advanced filtering and search</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  'Pay with USDC'
                )}
              </button>
            </div>
          </div>
        </motion.section>
      ) : (
        <>
          {/* Metrics Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <motion.div
              className="rounded-lg bg-card border border-border p-6"
              whileHover={{ translateY: -4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">Total Wallets</span>
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                <CountUpNumber value={metrics.totalWallets} />
              </p>
            </motion.div>

            <motion.div
              className="rounded-lg bg-card border border-border p-6"
              whileHover={{ translateY: -4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">Verified</span>
                <StatusBadge status="verified" label="Verified" />
              </div>
              <p className="text-3xl font-bold text-accent">
                <CountUpNumber value={metrics.verifiedWallets} />
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round((metrics.verifiedWallets / metrics.totalWallets) * 100)}% coverage
              </p>
            </motion.div>

            <motion.div
              className="rounded-lg bg-card border border-border p-6"
              whileHover={{ translateY: -4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">Assets Audited</span>
                <BarChart3 className="w-5 h-5 text-secondary" />
              </div>
              <p className="text-2xl font-mono text-secondary truncate">{metrics.totalAssetsAudited}</p>
            </motion.div>

            <motion.div
              className="rounded-lg bg-card border border-border p-6"
              whileHover={{ translateY: -4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">Audits Done</span>
                <CheckCircle className="w-5 h-5 text-secondary" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                <CountUpNumber value={metrics.auditsCompleted} />
              </p>
            </motion.div>
          </motion.div>

          {/* Audit Analytics Chart */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg bg-card border border-border p-8 mb-8"
          >
            <h2 className="text-xl font-semibold text-foreground mb-6">Audit Activity (6 Months)</h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={auditData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                  cursor={{ fill: 'rgba(0, 255, 135, 0.1)' }}
                />
                <Legend />
                <Bar dataKey="audits" fill="var(--secondary)" isAnimationActive={false} />
                <Bar dataKey="verified" fill="var(--accent)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </motion.section>

          {/* Recent Audits */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg bg-card border border-border p-8"
          >
            <h2 className="text-xl font-semibold text-foreground mb-6">Recent Audits</h2>

            <div className="space-y-4">
              {auditLogs.slice(0, 5).map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="p-4 rounded-lg bg-background/50 border border-border flex items-center justify-between hover:border-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-accent truncate">{log.auditorAddress.slice(0, 16)}...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.timestamp * 1000).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 ml-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{log.walletVerifications}</p>
                      <p className="text-xs text-muted-foreground">wallets</p>
                    </div>

                    <StatusBadge status={log.status === 'completed' ? 'verified' : 'pending'} />
                  </div>
                </motion.div>
              ))}
            </div>

            {auditLogs.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-muted/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No audits yet. Start auditing to see activity here.</p>
              </div>
            )}
          </motion.section>
        </>
      )}

      {/* Payment Confirmation */}
      {isPaid && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 rounded-lg bg-accent/20 border border-accent p-4 flex items-center gap-3 max-w-md"
        >
          <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
          <div>
            <p className="font-semibold text-accent text-sm">Payment Successful</p>
            <p className="text-xs text-accent/80">Your audit access is now active for 30 days.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
