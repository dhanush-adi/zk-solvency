import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted/20',
        className
      )}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Grid cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={`card-${i}`} className="rounded-lg bg-card border border-border p-6 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Large content areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-lg bg-card border border-border p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="rounded-lg bg-card border border-border p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
