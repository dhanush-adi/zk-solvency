'use client';

import { ReactNode, Component, ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-lg bg-destructive/20 border border-destructive/50 p-6 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Something went wrong</h3>
              <p className="text-sm text-destructive/80 mt-1">
                {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
