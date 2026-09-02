import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { toPersianDigits } from '@edalat/shared';

import { CatalogPagination } from '@/components/catalog/catalog-pagination';
import { CatalogEmptyState, CatalogErrorState } from '@/components/catalog/catalog-states';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ProductCard } from '@/components/product/product-card';
import { SortSelect } from '@/components/catalog/sort-select';
import { ApiError, api, attempt } from '@/lib/api';
import { parseCatalogParams, toApiQuery, type RawSearchParams } from '@/lib/catalog-params';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

async function findBrand(slug: string) {
  try {
    return await api.brands.bySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await findBrand(slug);
  if (!brand) return { title: 'برند یافت نشد' };

  const title = `محصولات برند ${brand.name}`;
  const description =
    brand.description ?? `خرید خرده و عمده محصولات برند ${brand.name} در عدالت فیلتر.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/brands/${brand.slug}` },
    openGraph: { title, description, url: `${SITE_URL}/brands/${brand.slug}` },
  };
}

/**
 * PRD §43 — جزئیات برند محصول + کاتالوگ فیلترشدهٔ همان برند.
 *
 * منطق فیلتر و صفحه‌بندی عیناً همان چیزی است که `/products` استفاده می‌کند
 * (`parseCatalogParams` / `toApiQuery` / `CatalogPagination` / `SortSelect`) —
 * فقط `brand` روی اسلاگ همین صفحه قفل می‌شود. صفحه‌بندی و مرتب‌سازی به‌جای
 * بازسازی یک تجربهٔ موازی، کاربر را به `/products?brand=...` (با فیلتر کامل)
 * می‌برند؛ همان الگویی که `SortSelect`/`CatalogPagination` از قبل دارند.
 */
export default async function BrandDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const brand = await findBrand(slug);
  if (!brand) notFound();

  const rawParams = parseCatalogParams(await searchParams);
  const catalogParams = { ...rawParams, brand: brand.slug };

  const catalogResult = await attempt(api.products.catalog(toApiQuery(catalogParams)));

  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <nav aria-label="مسیر صفحه" className="mb-6 text-sm text-ink-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink-800">خانه</Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href="/brands" className="hover:text-ink-800">برندها</Link>
            </li>
            <li aria-hidden>›</li>
            <li className="font-bold text-ink-800" aria-current="page">{brand.name}</li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-center gap-5">
          <span className="relative grid size-20 shrink-0 place-items-center rounded-card bg-surface">
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={72}
                height={72}
                className="h-16 w-16 object-contain"
              />
            ) : (
              <span className="text-2xl font-bold text-ink-400">{brand.name.charAt(0)}</span>
            )}
          </span>
          <div>
            <h1 className="text-2xl font-black text-ink-800 md:text-3xl">{brand.name}</h1>
            {brand.country && <p className="mt-1 text-sm text-ink-500">ساخت {brand.country}</p>}
          </div>
        </div>

        {brand.description && (
          <p className="mt-6 max-w-3xl text-sm leading-8 text-ink-500">{brand.description}</p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-bold text-ink-800 md:text-lg">
            محصولات {brand.name}
            {catalogResult.ok && (
              <span className="ms-2 text-sm font-normal text-ink-500">
                ({toPersianDigits(catalogResult.data.pagination.total)} محصول)
              </span>
            )}
          </h2>
          <SortSelect params={catalogParams} />
        </div>

        <div className="mt-6">
          {!catalogResult.ok ? (
            <CatalogErrorState message={catalogResult.error} />
          ) : catalogResult.data.items.length === 0 ? (
            <CatalogEmptyState query="" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {catalogResult.data.items.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 4} />
                ))}
              </div>

              <CatalogPagination params={catalogParams} pagination={catalogResult.data.pagination} />

              <p className="mt-10 text-center text-sm text-ink-500">
                برای فیلتر بیشتر (دسته‌بندی، خودرو، قیمت) به{' '}
                <Link
                  href={`/products?brand=${brand.slug}`}
                  className="font-bold text-ink-800 underline underline-offset-4"
                >
                  فروشگاه
                </Link>{' '}
                بروید.
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
