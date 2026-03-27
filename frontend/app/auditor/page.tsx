import { Metadata } from 'next';
import { AuditorDashboardClient } from '@/components/auditor/AuditorDashboardClient';

export const metadata: Metadata = {
  title: 'Auditor Dashboard | ZK-Solvency',
  description: 'Advanced audit tools and payment-gated verification features',
};

export default function AuditorPage() {
  return <AuditorDashboardClient />;
}
