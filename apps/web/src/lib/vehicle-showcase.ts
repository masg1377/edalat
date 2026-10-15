import type { VehicleSummary } from '@edalat/shared';
import { api, safe } from '@/lib/api';
import { vehicleAssets } from '@/lib/design-assets';

/** Resolve real catalogue records so slide names, details and links agree. */
export async function loadShowcaseVehicles(brands: { slug: string }[]): Promise<VehicleSummary[]> {
  const brand = brands.find((item) => item.slug === 'ikco') ?? brands[0];
  if (!brand) return [];
  const models = await safe(api.vehicles.models(brand.slug), []);
  const variants = await Promise.all(
    models.slice(0, 6).map((model) => safe(api.vehicles.variants(brand.slug, model), [])),
  );
  const order = ['samand-ef7', ...Object.keys(vehicleAssets)];
  return variants.flat().sort((a, b) => {
    const rank = (slug: string) => (order.includes(slug) ? order.indexOf(slug) : order.length);
    return rank(a.slug) - rank(b.slug);
  });
}
