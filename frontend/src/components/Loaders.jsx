/** Skeleton placeholders — required around every async surface. */
export function Skeleton({ className = '' }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
      <p className="font-medium">Couldn’t load data</p>
      <p className="mt-1 opacity-80">{String(error?.message || error)}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700">
          Retry
        </button>
      )}
    </div>
  );
}
