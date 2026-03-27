import { Metadata } from 'next';
import { ProofDetailsClient } from '@/components/proof/ProofDetailsClient';

export const metadata: Metadata = {
  title: 'Proof Details | ZK-Solvency',
  description: 'Detailed information about the current proof of reserves',
};

export default function ProofDetailsPage() {
  return <ProofDetailsClient />;
}
