'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { VehicleSummary } from '@edalat/shared';

import { api } from '@/lib/api';
import { buildCatalogHref, type CatalogParams } from '@/lib/catalog-params';

interface VehicleBrandOption {
  id: string;
  name: string;
  slug: string;
}

interface VehicleFilterProps {
  params: CatalogParams;
  brands: VehicleBrandOption[];
  /** Label of the currently applied vehicle, resolved server-side. */
  selectedLabel?: string | null;
}

/**
 * PRD §25 — brand → model → variant, the shared vehicle selector in its
 * filter-panel form. It reads from the existing `/vehicles` endpoints, so it is
 * already wired to real data rather than waiting on a future selector.
 *
 * Only the final choice touches the URL: picking a brand or model narrows the
 * next dropdown, but the catalog is not re-filtered until a concrete vehicle
 * (with its id) is selected, because compatibility is an id-level relation.
 */
export function VehicleFilter({ params, brands, selectedLabel }: VehicleFilterProps) {
  const router = useRouter();
  const [brandSlug, setBrandSlug] = useState('');
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

  const field =
    'h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800 ' +
    'outline-none transition-colors focus:border-brand-500 disabled:bg-ink-50 disabled:text-ink-400';

  if (params.vehicleId) {
    return (
      <div className="rounded-lg bg-brand-500/15 p-3">
        <p className="text-sm font-bold text-ink-800">{selectedLabel ?? 'خودرو انتخاب‌شده'}</p>
        <p className="mt-1 text-xs text-ink-500">فقط قطعات سازگار با این خودرو نمایش داده می‌شوند.</p>
        <button
          type="button"
          onClick={() => router.push(buildCatalogHref(params, { vehicleId: '' }))}
          className="mt-3 text-xs font-bold text-ink-700 underline underline-offset-4 hover:text-ink-900"
        >
          حذف فیلتر خودرو
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">برند خودرو</span>
        <select
          value={brandSlug}
          onChange={(event) => setBrandSlug(event.target.value)}
          className={field}
        >
          <option value="">برند خودرو</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="sr-only">مدل خودرو</span>
        <select
          value={model}
          onChange={(event) => setModel(event.target.value)}
          disabled={!brandSlug || loading === 'models'}
          className={field}
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
            if (event.target.value) {
              router.push(buildCatalogHref(params, { vehicleId: event.target.value }));
            }
          }}
          disabled={!model || loading === 'variants'}
          className={field}
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
