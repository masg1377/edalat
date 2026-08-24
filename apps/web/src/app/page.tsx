import { BrandStrip } from '@/components/home/brand-strip';
import { CategoryStrip } from '@/components/home/category-strip';
import { Hero } from '@/components/home/hero';
import { PrivateLabelBanner } from '@/components/home/private-label-banner';
import { ProductRail } from '@/components/home/product-rail';
import { QuickSearch } from '@/components/home/quick-search';
import { TrustBar } from '@/components/home/trust-bar';
import { VehiclePanel } from '@/components/home/vehicle-panel';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { api, safe } from '@/lib/api';

/** Home is statically rendered and refreshed in the background. */
export const revalidate = 300;

export default async function HomePage() {
  // Every section degrades to its own empty state, so one failing endpoint
  // cannot take the whole page down.
  const [categories, vehicleBrands, bestSelling] = await Promise.all([
    safe(api.categories.list(), []),
    safe(api.vehicles.brands(), []),
    safe(api.products.bestSelling(8), []),
  ]);

  return (
    <>
      <Header overlay />

      <main>
        <Hero />
        <QuickSearch brands={vehicleBrands} />
        <CategoryStrip categories={categories} />
        <VehiclePanel vehicle={null} />
        <BrandStrip brands={vehicleBrands} />
        <ProductRail title="پر فروش ترین محصولات" products={bestSelling} moreHref="/products" />
        <PrivateLabelBanner />
        <TrustBar />
      </main>

      <Footer />
    </>
  );
}
