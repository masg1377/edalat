import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ProductGridSkeleton } from '@/components/product/product-card-skeleton';

/**
 * Streamed while the catalog request is in flight. The layout matches the real
 * page — sidebar column, toolbar row, grid — so nothing jumps on swap.
 */
export default function ProductsLoading() {
  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <div className="mb-6 h-4 w-40 animate-pulse rounded bg-ink-100" />
        <div className="h-9 w-64 animate-pulse rounded bg-ink-100" />
        <div className="mt-6 h-16 max-w-3xl animate-pulse rounded-pill bg-sand" />

        <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block" aria-hidden>
            <div className="space-y-6">
              {Array.from({ length: 4 }, (_, section) => (
                <div key={section} className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />
                  {Array.from({ length: 4 }, (_, row) => (
                    <div key={row} className="h-9 w-full animate-pulse rounded-lg bg-ink-50" />
                  ))}
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />
              <div className="h-12 w-44 animate-pulse rounded-pill bg-ink-100" />
            </div>

            <ProductGridSkeleton count={12} />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
