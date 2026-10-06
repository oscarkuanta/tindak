export function Skeleton({ className = '', label = 'Memuat' }) {
  return (
    <div
      aria-label={label}
      role="status"
      className={`animate-pulse rounded-base bg-border/70 ${className}`}
    />
  );
}

export function BoardCardSkeleton() {
  return (
    <div className="rounded-base border border-border bg-surface p-4" aria-hidden="true">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/3" />
      <Skeleton className="mt-5 h-3 w-full" />
    </div>
  );
}
