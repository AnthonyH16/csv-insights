export function InsightsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-2xl border border-[--color-border] bg-[--color-bg-elev]"
        />
      ))}
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="h-72 animate-pulse rounded-2xl border border-[--color-border] bg-[--color-bg-elev]" />
      <div className="h-72 animate-pulse rounded-2xl border border-[--color-border] bg-[--color-bg-elev]" />
    </div>
  );
}
