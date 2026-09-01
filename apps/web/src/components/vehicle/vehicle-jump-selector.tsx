'use client';

import { useRouter } from 'next/navigation';
import type { VehicleSummary } from '@edalat/shared';

import { VehicleSelector, type VehicleBrandOption } from './vehicle-selector';

interface VehicleJumpSelectorProps {
  brands: VehicleBrandOption[];
  /** Pre-locks the brand on a brand's own page (`/vehicles/[slug]`). */
  lockedBrand?: VehicleBrandOption;
}

/**
 * Thin client wrapper around the shared selector for the `/vehicles` IA
 * (PRD §5, §25): picking a variant here means "take me straight to its
 * detail page", unlike the catalog filter which narrows a product list.
 */
export function VehicleJumpSelector({ brands, lockedBrand }: VehicleJumpSelectorProps) {
  const router = useRouter();

  return (
    <VehicleSelector
      brands={brands}
      lockedBrand={lockedBrand}
      onSelectVariant={(variant: VehicleSummary) => router.push(`/vehicles/${variant.slug}`)}
    />
  );
}
