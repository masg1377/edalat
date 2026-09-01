'use client';

import { useRouter } from 'next/navigation';

import { Button, ButtonLink } from '@/components/ui/button';

/** PRD §75 — the brand list on `/vehicles` is primary content, so it gets its own error state. */
export function VehiclesErrorState({ message }: { message: string }) {
  const router = useRouter();

  return (
    <div role="alert" className="rounded-card bg-surface px-6 py-16 text-center">
      <h2 className="text-lg font-bold text-ink-800 md:text-xl">فهرست خودروها بارگذاری نشد</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-ink-500">{message}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button size="lg" onClick={() => router.refresh()}>
          تلاش دوباره
        </Button>
        <ButtonLink href="/" variant="muted" size="lg">
          بازگشت به صفحه اصلی
        </ButtonLink>
      </div>
    </div>
  );
}
