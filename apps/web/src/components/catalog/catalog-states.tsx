'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, ButtonLink } from '@/components/ui/button';
import { CameraIcon } from '@/components/ui/icons';

/**
 * PRD §74 / §88 — a search that finds nothing is a lead, not a dead end.
 *
 * The copy never stops at "no products found": it hands the customer the photo
 * flow, which routes to a human who can identify, source or manufacture the
 * part. This is the highest-value conversion path on the site.
 */
export function CatalogEmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-card bg-surface px-6 py-16 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-500">
        <CameraIcon className="size-8 text-ink-900" aria-hidden />
      </span>

      <h2 className="mt-6 text-lg font-bold text-ink-800 md:text-xl">
        محصول موردنظر را پیدا نکردید؟
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-ink-500">
        {query ? (
          <>
            برای «<b className="text-ink-700">{query}</b>» نتیجه‌ای پیدا نشد. تصویر آن را برای ما
            ارسال کنید تا بررسی کنیم — اگر موجود باشد پیدایش می‌کنیم، اگر نباشد تأمین یا تولیدش را
            بررسی می‌کنیم.
          </>
        ) : (
          <>
            با این فیلترها محصولی پیدا نشد. تصویر قطعه را برای ما ارسال کنید تا کارشناسان ما آن را
            شناسایی کنند.
          </>
        )}
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <ButtonLink href="/product-request" size="lg">
          ارسال تصویر محصول
        </ButtonLink>
        <Link
          href="/products"
          className="inline-flex h-14 items-center rounded-pill px-6 text-sm text-ink-600 underline-offset-4 hover:underline"
        >
          مشاهده همه محصولات
        </Link>
      </div>
    </div>
  );
}

/** Shown when the catalog request itself failed — never the raw backend error. */
export function CatalogErrorState({ message }: { message: string }) {
  const router = useRouter();

  return (
    <div role="alert" className="rounded-card bg-surface px-6 py-16 text-center">
      <h2 className="text-lg font-bold text-ink-800 md:text-xl">
        فهرست محصولات بارگذاری نشد
      </h2>
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
