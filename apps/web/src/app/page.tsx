import { HomeView } from '@/components/home/home-view';
import { api, safe } from '@/lib/api';
import { loadShowcaseVehicles } from '@/lib/vehicle-showcase';
export const revalidate = 300;
export default async function HomePage() {
  const [categories, vehicleBrands, bestSelling] = await Promise.all([
    safe(api.categories.list(), []),
    safe(api.vehicles.brands(), []),
    safe(api.products.bestSelling(3), []),
  ]);
  const vehicles = await loadShowcaseVehicles(vehicleBrands);
  return (
    <HomeView
      categories={categories}
      vehicleBrands={vehicleBrands}
      bestSelling={bestSelling}
      vehicle={null}
      vehicles={vehicles}
    />
  );
}
