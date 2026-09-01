'use client';

import { useRouter } from 'next/navigation';
import type { VehicleSummary } from '@edalat/shared';

import { VehicleSelector, type VehicleBrandOption } from '@/components/vehicle/vehicle-selector';
import { buildCatalogHref, type CatalogParams } from '@/lib/catalog-params';

interface VehicleFilterProps {
  params: CatalogParams;
  brands: VehicleBrandOption[];
  /** Label of the currently applied vehicle, resolved server-side. */
  selectedLabel?: string | null;
}

/**
 * PRD §25 — brand → model → variant, the shared vehicle selector in its
 * filter-panel form. The cascading logic itself lives in
 * `components/vehicle/vehicle-selector.tsx` (shared with `/vehicles`); this
 * component only owns what is catalog-specific: showing the already-applied
 * vehicle as a removable chip, and turning a final selection into a catalog
 * URL (`vehicleId`, since compatibility is an id-level relation).
 */
export function VehicleFilter({ params, brands, selectedLabel }: VehicleFilterProps) {
  const router = useRouter();

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
    <VehicleSelector
      brands={brands}
      onSelectVariant={(variant: VehicleSummary) =>
        router.push(buildCatalogHref(params, { vehicleId: variant.id }))
      }
    />
  );
}
