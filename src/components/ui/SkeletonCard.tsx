export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="mb-3 aspect-[4/3] rounded-xl bg-gray-200" />
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
      <div className="mb-1 h-3 w-1/2 rounded bg-gray-200" />
      <div className="h-3 w-2/3 rounded bg-gray-200" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 rounded-lg bg-gray-200" />
      <div className="h-10 rounded-lg bg-gray-200" />
      <div className="h-10 rounded-lg bg-gray-200" />
      <div className="h-12 rounded-lg bg-gray-200" />
    </div>
  );
}
