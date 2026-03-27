'use client';

import { Github, Twitter, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground">ZK-Solvency</h3>
            <p className="text-sm text-muted-foreground">
              Cryptographic proof of reserves with zero-knowledge verification.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-foreground text-sm">Resources</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Documentation', href: '#' },
                { label: 'API Reference', href: '#' },
                { label: 'GitHub', href: '#' },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-accent transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-foreground text-sm">Connect</h4>
            <div className="flex items-center gap-4">
              {[
                { icon: Github, href: '#' },
                { icon: Twitter, href: '#' },
                { icon: Mail, href: '#' },
              ].map(({ icon: Icon, href }) => (
                <a
                  key={href}
                  href={href}
                  className="p-2 rounded-lg hover:bg-card text-muted-foreground hover:text-accent transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {currentYear} ZK-Solvency. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs">
            <a href="#" className="text-muted-foreground hover:text-accent transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-accent transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
