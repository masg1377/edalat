'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toPersianDigits } from '@edalat/shared';

import { Button } from '@/components/ui/button';
import { buildCatalogHref, type CatalogParams } from '@/lib/catalog-params';

interface PriceRangeFilterProps {
  params: CatalogParams;
  bounds: { min: number; max: number };
}

/**
 * Price bounds are free-form, so unlike the other filters this one needs local
 * input state. It still writes its result to the URL rather than holding the
 * applied filter in React — the URL stays the source of truth.
 */
export function PriceRangeFilter({ params, bounds }: PriceRangeFilterProps) {
  const router = useRouter();
  const [min, setMin] = useState(params.minPrice?.toString() ?? '');
  const [max, setMax] = useState(params.maxPrice?.toString() ?? '');

  // Re-sync when navigation changes the URL (back button, clearing filters).
  useEffect(() => {
    setMin(params.minPrice?.toString() ?? '');
    setMax(params.maxPrice?.toString() ?? '');
  }, [params.minPrice, params.maxPrice]);

  const apply = () => {
    const parsedMin = min.trim() === '' ? null : Math.max(0, Number(min));
    const parsedMax = max.trim() === '' ? null : Math.max(0, Number(max));
    if (parsedMin !== null && Number.isNaN(parsedMin)) return;
    if (parsedMax !== null && Number.isNaN(parsedMax)) return;

    // Swap reversed bounds rather than returning nothing.
    const [lo, hi] =
      parsedMin !== null && parsedMax !== null && parsedMin > parsedMax
        ? [parsedMax, parsedMin]
        : [parsedMin, parsedMax];

    router.push(buildCatalogHref(params, { minPrice: lo, maxPrice: hi }));
  };

  const field =
    'ltr-num h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800 ' +
    'outline-none transition-colors focus:border-brand-500';

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="flex-1">
          <span className="mb-1.5 block text-xs text-ink-500">از</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={min}
            onChange={(event) => setMin(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && apply()}
            placeholder="0"
            aria-label="حداقل قیمت به تومان"
            className={field}
          />
        </label>
        <label className="flex-1">
          <span className="mb-1.5 block text-xs text-ink-500">تا</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={max}
            onChange={(event) => setMax(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && apply()}
            placeholder={String(bounds.max || '')}
            aria-label="حداکثر قیمت به تومان"
            className={field}
          />
        </label>
      </div>

      {bounds.max > 0 && (
        <p className="mt-2 text-[11px] text-ink-400">
          محدوده موجود: {toPersianDigits(bounds.min.toLocaleString('en-US'))} تا{' '}
          {toPersianDigits(bounds.max.toLocaleString('en-US'))} تومان
        </p>
      )}

      <Button onClick={apply} variant="muted" size="sm" className="mt-3 w-full">
        اعمال قیمت
      </Button>
    </div>
  );
}
