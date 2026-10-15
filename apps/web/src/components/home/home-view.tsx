import type { CategorySummary, ProductSummary, VehicleSummary } from '@edalat/shared';
import { BrandStrip } from './brand-strip';
import { CategoryStrip } from './category-strip';
import { Hero } from './hero';
import { PrivateLabelBanner } from './private-label-banner';
import { ProductRail } from './product-rail';
import { QuickSearch } from './quick-search';
import { TrustBar } from './trust-bar';
import { VehiclePanel } from './vehicle-panel';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
interface HomeViewProps {
  categories: CategorySummary[];
  vehicleBrands: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    logoUrl: string | null;
  }[];
  bestSelling: ProductSummary[];
  vehicle: VehicleSummary | null;
  vehicles?: VehicleSummary[];
}
export function HomeView({
  categories,
  vehicleBrands,
  bestSelling,
  vehicle,
  vehicles,
}: HomeViewProps) {
  const categoryOrder = ['air-filter', 'cabin-filter', 'oil-filter', 'oil-strainer'];
  const brandOrder = ['bmw', 'toyota', 'kia', 'ikco', 'saipa', 'audi', 'hyundai', 'benz'];
  const rank = (order: string[], slug: string) => {
    const index = order.indexOf(slug);
    return index < 0 ? 100 : index;
  };
  const orderedCategories = [...categories].sort(
    (a, b) => rank(categoryOrder, a.slug) - rank(categoryOrder, b.slug),
  );
  const orderedBrands = [...vehicleBrands].sort(
    (a, b) => rank(brandOrder, a.slug) - rank(brandOrder, b.slug),
  );
  return (
    <>
      <Header overlay />
      <main className="home-page">
        <Hero />
        <QuickSearch brands={vehicleBrands} />
        <CategoryStrip categories={orderedCategories} />
        <VehiclePanel vehicle={vehicle} vehicles={vehicles} />
        <BrandStrip brands={orderedBrands} />
        <ProductRail title="پر فروش ترین محصولات" products={bestSelling} moreHref="/products" />
        <PrivateLabelBanner />
        <TrustBar />
      </main>
      <Footer />
    </>
  );
}
