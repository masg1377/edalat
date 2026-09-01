import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';

export default function VehicleDetailLoading() {
  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <div className="mb-6 h-4 w-56 animate-pulse rounded bg-ink-100" />

        <div className="flex items-center gap-3">
          <div className="size-12 animate-pulse rounded-full bg-ink-100" />
          <div className="h-7 w-64 animate-pulse rounded bg-ink-100" />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="order-2 space-y-8 lg:order-1">
            <div className="rounded-card bg-surface-soft p-6 md:p-8">
              <div className="h-5 w-28 animate-pulse rounded bg-ink-100" />
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-14 animate-pulse rounded bg-ink-100" />
                    <div className="h-4 w-20 animate-pulse rounded bg-ink-100" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-card bg-ink-100 p-6 md:p-8" aria-hidden>
              <div className="h-5 w-40 animate-pulse rounded bg-white/40" />
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-white/30" />
                ))}
              </div>
            </div>

            <div role="status" aria-live="polite">
              <span className="sr-only">در حال بارگذاری اطلاعات خودرو…</span>
              <div className="h-5 w-48 animate-pulse rounded bg-ink-100" />
              <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-card bg-surface" />
                ))}
              </div>
            </div>
          </div>

          <aside className="order-1 h-max rounded-card bg-white p-6 shadow-card lg:order-2">
            <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-11 w-full animate-pulse rounded-lg bg-ink-50" />
              ))}
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}
