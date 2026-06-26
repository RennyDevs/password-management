interface SkeletonProps {
  className?: string;
  /** Number of skeleton lines (for lists) */
  count?: number;
  /** Variant of skeleton */
  variant?: 'text' | 'card' | 'avatar' | 'button';
}

export default function Skeleton({ className = '', count = 1, variant = 'text' }: SkeletonProps) {
  const baseClass = 'skeleton';

  const variants: Record<string, string> = {
    text: 'h-4 w-full',
    card: 'h-24 w-full',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24',
  };

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`${baseClass} ${variants[variant]} ${className}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading..." role="status">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="vault-card p-4">
          <div className="skeleton h-5 w-2/3 mb-2" />
          <div className="skeleton h-3 w-1/3 mb-3" />
          <div className="flex gap-2">
            <div className="skeleton h-8 w-16 rounded-lg" />
            <div className="skeleton h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
