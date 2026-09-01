'use client';

import { useEffect, useState } from 'react';
import type { VehicleSummary } from '@edalat/shared';

import { api } from '@/lib/api';

export interface VehicleBrandOption {
  id: string;
  name: string;
  slug: string;
}

interface VehicleSelectorProps {
  /** Brand options for step 1. Ignored when `lockedBrand` is set. */
  brands: VehicleBrandOption[];
  /** Fires once a concrete variant (generation/engine/year) is picked. */
  onSelectVariant: (variant: VehicleSummary) => void;
  /**
   * Skips the brand step and starts from "model" — used on a brand's own
   * page (`/vehicles/[slug]`) where the brand is already known from the URL.
   */
  lockedBrand?: VehicleBrandOption;
  className?: string;
  fieldClassName?: string;
}

const DEFAULT_FIELD_CLASS =
  'h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800 ' +
  'outline-none transition-colors focus:border-brand-500 disabled:bg-ink-50 disabled:text-ink-400';

/**
 * PRD §25 — «سیستم باید یک Vehicle Selector مشترک داشته باشد»: برند → مدل →
 * تیپ/موتور، با API واقعی.
 *
 * این کامپوننت تنها مسیر fetch/state این جریان است. مصرف‌کننده‌ها (فیلتر
 * کاتالوگ در `catalog/vehicle-filter.tsx` و صفحهٔ مستقل `/vehicles`) فقط
 * `onSelectVariant` را پیاده می‌کنند — یکی به URL کاتالوگ می‌رود، دیگری به
 * صفحهٔ جزئیات خودرو؛ منطق cascading selector هرگز تکرار نمی‌شود.
 */
export function VehicleSelector({
  brands,
  onSelectVariant,
  lockedBrand,
  className,
  fieldClassName = DEFAULT_FIELD_CLASS,
}: VehicleSelectorProps) {
  const [brandSlug, setBrandSlug] = useState(lockedBrand?.slug ?? '');
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [variants, setVariants] = useState<VehicleSummary[]>([]);
  const [loading, setLoading] = useState<'models' | 'variants' | null>(null);

  useEffect(() => {
    setModel('');
    setVariants([]);
    if (!brandSlug) {
      setModels([]);
      return;
    }
    setLoading('models');
    api.vehicles
      .models(brandSlug)
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setLoading(null));
  }, [brandSlug]);

  useEffect(() => {
    if (!brandSlug || !model) {
      setVariants([]);
      return;
    }
    setLoading('variants');
    api.vehicles
      .variants(brandSlug, model)
      .then(setVariants)
      .catch(() => setVariants([]))
      .finally(() => setLoading(null));
  }, [brandSlug, model]);

  return (
    <div className={className ?? 'space-y-3'}>
      {!lockedBrand && (
        <label className="block">
          <span className="sr-only">برند خودرو</span>
          <select
            value={brandSlug}
            onChange={(event) => setBrandSlug(event.target.value)}
            className={fieldClassName}
          >
            <option value="">برند خودرو</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="sr-only">مدل خودرو</span>
        <select
          value={model}
          onChange={(event) => setModel(event.target.value)}
          disabled={!brandSlug || loading === 'models'}
          className={fieldClassName}
        >
          <option value="">{loading === 'models' ? 'در حال بارگذاری…' : 'مدل خودرو'}</option>
          {models.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="sr-only">تیپ و موتور</span>
        <select
          value=""
          onChange={(event) => {
            const variant = variants.find((item) => item.id === event.target.value);
            if (variant) onSelectVariant(variant);
          }}
          disabled={!model || loading === 'variants'}
          className={fieldClassName}
        >
          <option value="">{loading === 'variants' ? 'در حال بارگذاری…' : 'تیپ و موتور'}</option>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {[variant.generation, variant.engine].filter(Boolean).join(' — ') || variant.model}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
