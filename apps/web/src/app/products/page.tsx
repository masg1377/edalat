import type { Metadata } from 'next';
import Link from 'next/link';
import { toPersianDigits } from '@edalat/shared';

import { CatalogPagination } from '@/components/catalog/catalog-pagination';
import { CatalogEmptyState, CatalogErrorState } from '@/components/catalog/catalog-states';
import { FiltersPanel } from '@/components/catalog/filters-panel';
import { MobileFilters } from '@/components/catalog/mobile-filters';
import { SortSelect } from '@/components/catalog/sort-select';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ProductCard } from '@/components/product/product-card';
import { SearchBar } from '@/components/search/search-bar';
import { attempt, safe, api } from '@/lib/api';
import {
  buildCatalogHref,
  hasActiveFilters,
  parseCatalogParams,
  toApiQuery,
  type RawSearchParams,
} from '@/lib/catalog-params';

interface PageProps {
  searchParams: Promise<RawSearchParams>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * SEO: only the clean catalog and single-category views are indexable.
 *
 * Filter combinations multiply into thousands of near-duplicate URLs, so
 * anything beyond a category facet is marked `noindex, follow` — crawlers still
 * walk through to the product pages, but the permutations never enter the index.
 * The canonical always points at the un-paginated, un-filtered category view.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = parseCatalogParams(await searchParams);

  const category = params.category
    ? await safe(
        api.categories.list().then((all) => all.find((c) => c.slug === params.category) ?? null),
        null,
      )
    : null;

  const title = params.q
    ? `جستجوی «${params.q}»`
    : category
      ? `${category.name} — خرید خرده و عمده`
      : 'فروشگاه فیلتر و قطعات خودرو';

  const description = category
    ? `خرید ${category.name} با قیمت خرده و عمده، همراه با کد فنی، خودروهای سازگار و بازه تعویض.`
    : 'فهرست کامل فیلترها و قطعات مصرفی خودرو در عدالت فیلتر. جستجو با نام، کد فنی یا خودرو، با قیمت خرده و عمده.';

  // A filtered or paged view is a variation of the category page, not a page
  // of its own — beyond category, nothing should be indexed separately.
  const beyondCategory =
    Boolean(params.q) ||
    Boolean(params.brand) ||
    Boolean(params.vehicleId) ||
    params.minPrice !== null ||
    params.maxPrice !== null ||
    params.inStock ||
    params.purchaseType !== null;

  const canonicalPath = params.category ? `/products?category=${params.category}` : '/products';

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${canonicalPath}` },
    robots:
      beyondCategory || params.page > 1
        ? { index: false, follow: true }
        : { index: true, follow: true },
    openGraph: { title, description, url: `${SITE_URL}${canonicalPath}` },
  };
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = parseCatalogParams(await searchParams);

  // The catalog is the page; the reference data around it is decoration, so
  // only the catalog call gets an error state — the rest degrade to empty.
  const [catalogResult, categories, vehicleBrands] = await Promise.all([
    attempt(api.products.catalog(toApiQuery(params))),
    safe(api.categories.list(), []),
    safe(api.vehicles.brands(), []),
  ]);

  const selectedVehicle =
    params.vehicleId && catalogResult.ok
      ? await safe(
          api.vehicles
            .bySlugOrId(params.vehicleId)
            .then((v) => [v.brand.name, v.model, v.engine].filter(Boolean).join(' ')),
          null,
        )
      : null;

  const activeFilterCount = [
    params.category,
    params.brand,
    params.vehicleId,
    params.inStock ? 'inStock' : '',
    params.purchaseType ?? '',
    params.minPrice !== null || params.maxPrice !== null ? 'price' : '',
  ].filter(Boolean).length;

  const facets = catalogResult.ok
    ? catalogResult.data.facets
    : { brands: [], categories: [], priceRange: { min: 0, max: 0 } };

  const filters = (
    <FiltersPanel
      params={params}
      facets={facets}
      categories={categories}
      vehicleBrands={vehicleBrands}
      selectedVehicleLabel={selectedVehicle}
    />
  );

  return (
    <>
      <Header />

      <main className="catalog-page container-page pb-16 pt-8">
        <SearchBar className="catalog-search" defaultValue={params.q} />
        <nav aria-label="مسیر صفحه" className="mb-6 text-sm text-ink-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink-800">
                خانه
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-bold text-ink-800" aria-current="page">
              محصولات
            </li>
          </ol>
        </nav>

        <h1 className="text-2xl font-black text-ink-800 md:text-3xl">
          {params.q ? <>نتایج جستجو برای «{params.q}»</> : 'محصولات'}
        </h1>
        <p className="catalog-description">قطعات یدکی با کیفیت از برند های معتبر</p>

        <div className="catalog-layout mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="hidden lg:block" aria-label="فیلتر محصولات">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pe-2">
              {filters}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MobileFilters
                  activeCount={activeFilterCount}
                  activeCountLabel={toPersianDigits(activeFilterCount)}
                >
                  {filters}
                </MobileFilters>

                {catalogResult.ok && (
                  <p className="text-sm text-ink-500" aria-live="polite">
                    {toPersianDigits(catalogResult.data.pagination.total)} محصول
                    {catalogResult.data.pagination.totalPages > 1 && (
                      <>
                        {' '}
                        — صفحه {toPersianDigits(catalogResult.data.pagination.page)} از{' '}
                        {toPersianDigits(catalogResult.data.pagination.totalPages)}
                      </>
                    )}
                  </p>
                )}
              </div>

              <SortSelect params={params} />
            </div>

            {!catalogResult.ok ? (
              <CatalogErrorState message={catalogResult.error} />
            ) : catalogResult.data.items.length === 0 ? (
              <CatalogEmptyState query={params.q} />
            ) : (
              <>
                <div className="catalog-product-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {catalogResult.data.items.map((product, index) => (
                    <ProductCard key={product.id} product={product} priority={index < 4} />
                  ))}
                </div>

                <CatalogPagination params={params} pagination={catalogResult.data.pagination} />
              </>
            )}

            {catalogResult.ok &&
              catalogResult.data.items.length > 0 &&
              hasActiveFilters(params) && (
                <p className="mt-10 text-center text-sm text-ink-500">
                  آنچه می‌خواستید نبود؟{' '}
                  <Link
                    href={buildCatalogHref(params, {
                      category: '',
                      brand: '',
                      vehicleId: '',
                      minPrice: null,
                      maxPrice: null,
                      inStock: false,
                      purchaseType: null,
                    })}
                    className="font-bold text-ink-800 underline underline-offset-4"
                  >
                    حذف فیلترها
                  </Link>{' '}
                  یا{' '}
                  <Link
                    href="/product-request"
                    className="font-bold text-ink-800 underline underline-offset-4"
                  >
                    ارسال تصویر محصول
                  </Link>
                </p>
              )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
