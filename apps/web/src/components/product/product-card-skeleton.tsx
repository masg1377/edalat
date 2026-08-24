/**
 * Mirrors ProductCard's box model exactly so the grid does not reflow when
 * real cards replace the skeletons.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card bg-surface" aria-hidden>
      <div className="aspect-square animate-pulse bg-white" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-5 w-4/5 animate-pulse rounded bg-ink-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
        <div className="mt-1 h-4 w-2/3 animate-pulse rounded bg-ink-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
        <div className="mt-auto h-12 w-full animate-pulse rounded-pill bg-ink-100" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <span className="sr-only">در حال بارگذاری محصولات…</span>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
