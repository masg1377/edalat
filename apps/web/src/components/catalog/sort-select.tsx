'use client';

import { useRouter } from 'next/navigation';
import type { CatalogSort } from '@edalat/shared';

import { buildCatalogHref, SORT_OPTIONS, type CatalogParams } from '@/lib/catalog-params';

export function SortSelect({ params }: { params: CatalogParams }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2">
      <span className="shrink-0 text-sm text-ink-500">مرتب‌سازی:</span>
      <select
        value={params.sort}
        onChange={(event) =>
          router.push(buildCatalogHref(params, { sort: event.target.value as CatalogSort }))
        }
        className="h-12 rounded-pill border border-ink-200 bg-white px-4 text-sm font-bold text-ink-800 outline-none transition-colors focus:border-brand-500"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
