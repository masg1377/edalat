import { HomeView } from '@/components/home/home-view';
import { categories, vehicleBrands, bestSelling, vehicle } from '@/lib/design-fixtures';
import { loadShowcaseVehicles } from '@/lib/vehicle-showcase';
import { notFound } from 'next/navigation';
export const metadata = { title: 'پیش‌نمایش طراحی', robots: { index: false, follow: false } };
/** Development-only visual fixture. Production always uses the real API. */
export default async function DesignPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const vehicles = await loadShowcaseVehicles(vehicleBrands);
  return (
    <HomeView
      categories={categories}
      vehicleBrands={vehicleBrands}
      bestSelling={bestSelling}
      vehicle={vehicle}
      vehicles={vehicles}
    />
  );
}
