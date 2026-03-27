import { Metadata } from 'next';
import { DashboardClient } from '@/components/dashboard/DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard | ZK-Solvency',
  description: 'View real-time proof of reserves and solvency metrics',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
