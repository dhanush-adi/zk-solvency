import { Metadata } from 'next';
import { InclusionCheckerClient } from '@/components/inclusion/InclusionCheckerClient';

export const metadata: Metadata = {
  title: 'Inclusion Checker | ZK-Solvency',
  description: 'Verify if your wallet is included in the proof of reserves',
};

export default function InclusionCheckerPage() {
  return <InclusionCheckerClient />;
}
