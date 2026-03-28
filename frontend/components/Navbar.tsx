'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, Search, Settings, Activity } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/inclusion-checker', label: 'Verify Inclusion', icon: Search },
    { href: '/auditor', label: 'Auditor Portal', icon: Shield },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 group-hover:border-accent/40 transition-colors">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg leading-none tracking-tight text-foreground uppercase">ZK-Solvency</span>
              <span className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase leading-none mt-1">L3/L4 Protocol</span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-accent/5 border border-border/50">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300',
                    isActive
                      ? 'text-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-accent" : "text-muted-foreground")} />
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-accent/10 border border-accent/20 rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connect + Extra Controls */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center h-10 px-1 rounded-xl bg-accent/5 border border-border/50">
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors hover:bg-accent/10">
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="h-10 border-l border-border/50 mx-1 hidden sm:block" />
            <WalletConnect />
          </div>
        </div>
      </div>
    </nav>
  );
}
