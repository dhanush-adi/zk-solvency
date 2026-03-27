'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/inclusion-checker', label: 'Inclusion Checker' },
    { href: '/auditor', label: 'Auditor Dashboard' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Shield className="w-6 h-6 text-accent" />
            <span className="text-foreground">ZK-Solvency</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'text-sm font-medium transition-colors relative',
                  pathname === href
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
                {pathname === href && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </Link>
            ))}
          </div>

          {/* Wallet Connect */}
          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}
