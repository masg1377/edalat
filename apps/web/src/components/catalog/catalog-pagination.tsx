import Link from 'next/link';
import type { PaginationMeta } from '@edalat/shared';
import { toPersianDigits } from '@edalat/shared';

import { buildCatalogHref, type CatalogParams } from '@/lib/catalog-params';
import { cn } from '@/lib/utils';

/** A compact window around the current page: 1 … 4 5 6 … 20 */
function pageWindow(current: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>([1, totalPages, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < totalPages) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('gap');
    out.push(sorted[i]);
  }
  return out;
}

export function CatalogPagination({
  params,
  pagination,
}: {
  params: CatalogParams;
  pagination: PaginationMeta;
}) {
  if (pagination.totalPages <= 1) return null;

  const { page, totalPages, hasNext, hasPrevious } = pagination;
  const base =
    'grid h-11 min-w-11 place-items-center rounded-pill px-3 text-sm transition-colors';

  return (
    <nav aria-label="صفحه‌بندی محصولات" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {hasPrevious ? (
        <Link href={buildCatalogHref(params, { page: page - 1 })} className={cn(base, 'bg-sand text-ink-800 hover:bg-ink-100')} rel="prev">
          قبلی
        </Link>
      ) : (
        <span className={cn(base, 'cursor-not-allowed bg-ink-50 text-ink-300')} aria-disabled>
          قبلی
        </span>
      )}

      {pageWindow(page, totalPages).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-ink-400" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildCatalogHref(params, { page: entry })}
            aria-current={entry === page ? 'page' : undefined}
            aria-label={`صفحه ${toPersianDigits(entry)}`}
            className={cn(
              base,
              entry === page
                ? 'bg-brand-500 font-bold text-ink-900'
                : 'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50',
            )}
          >
            {toPersianDigits(entry)}
          </Link>
        ),
      )}

      {hasNext ? (
        <Link href={buildCatalogHref(params, { page: page + 1 })} className={cn(base, 'bg-sand text-ink-800 hover:bg-ink-100')} rel="next">
          بعدی
        </Link>
      ) : (
        <span className={cn(base, 'cursor-not-allowed bg-ink-50 text-ink-300')} aria-disabled>
          بعدی
        </span>
      )}
    </nav>
  );
}
