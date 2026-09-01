import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';

export default function VehiclesLoading() {
  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <div className="mb-6 h-4 w-32 animate-pulse rounded bg-ink-100" />
        <div className="h-9 w-56 animate-pulse rounded bg-ink-100" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-ink-100" />

        <div className="mt-10 grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="h-max rounded-card bg-white p-6 shadow-card">
            <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-11 w-full animate-pulse rounded-lg bg-ink-50" />
              ))}
            </div>
          </aside>

          <div role="status" aria-live="polite" className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
            <span className="sr-only">در حال بارگذاری خودروها…</span>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 rounded-card bg-surface p-6">
                <div className="size-16 animate-pulse rounded-full bg-white" />
                <div className="h-4 w-20 animate-pulse rounded bg-white" />
                <div className="h-3 w-14 animate-pulse rounded bg-white" />
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
