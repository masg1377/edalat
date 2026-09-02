import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { toPersianDigits } from '@edalat/shared';

import { CatalogPagination } from '@/components/catalog/catalog-pagination';
import { CatalogEmptyState, CatalogErrorState } from '@/components/catalog/catalog-states';
import { SortSelect } from '@/components/catalog/sort-select';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ProductCard } from '@/components/product/product-card';
import { ApiError, api, attempt } from '@/lib/api';
import { parseCatalogParams, toApiQuery, type RawSearchParams } from '@/lib/catalog-params';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

async function findCategory(slug: string) {
  try {
    return await api.categories.bySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) return { title: 'دسته‌بندی یافت نشد' };

  const title = category.name;
  const description =
    category.description ??
    `خرید ${category.name} با قیمت خرده و عمده، همراه با کد فنی، خودروهای سازگار و بازه تعویض.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/categories/${category.slug}` },
    openGraph: { title, description, url: `${SITE_URL}/categories/${category.slug}` },
  };
}

/**
 * PRD §63 — `/categories/{slug}` به‌عنوان URL کانونیک هر دسته.
 *
 * تا پیش از این فاز `GET /categories/:slug` (که زیردسته‌ها را هم برمی‌گرداند)
 * فقط داخلی برای پنل فیلتر کاتالوگ استفاده می‌شد؛ این صفحه اولین لندینگ
 * مستقل هر دسته است: زیردسته‌ها به‌صورت کارت (الگوی `CategoryStrip` صفحهٔ
 * اصلی) و محصولات خودِ همین دسته با همان منطق فیلتر/صفحه‌بندی `/products`
 * (بدون بازنویسی — دقیقاً همان چیزی که `/brands/[slug]` هم استفاده می‌کند).
 *
 * محدودیت مستندشده: `GET /products` فقط با یک اسلاگ دستهٔ دقیق فیلتر می‌کند
 * (بدون OR روی فرزندان)، پس «محصولات فرزندان» با کلیک روی هر کارت زیردسته
 * (که خودش همین الگو را دارد) دیده می‌شود، نه با تجمیع همهٔ فرزندان در یک
 * لیست مسطح — از چندین فراخوانی موازی کاتالوگ بدون صفحه‌بندی واقعی جلوگیری
 * می‌کند.
 */
export default async function CategoryDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();

  const rawParams = parseCatalogParams(await searchParams);
  const catalogParams = { ...rawParams, category: category.slug };

  const catalogResult = await attempt(api.products.catalog(toApiQuery(catalogParams)));
  const hasChildren = category.children.length > 0;

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
              <Link href="/products" className="hover:text-ink-800">محصولات</Link>
            </li>
            <li aria-hidden>›</li>
            <li className="font-bold text-ink-800" aria-current="page">{category.name}</li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-center gap-5">
          {category.imageUrl && (
            <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-card bg-surface">
              <Image src={category.imageUrl} alt="" width={72} height={72} className="h-16 w-16 object-contain" />
            </span>
          )}
          <div>
            <h1 className="text-2xl font-black text-ink-800 md:text-3xl">{category.name}</h1>
            {category.productCount !== undefined && (
              <p className="mt-1 text-sm text-ink-500">
                {toPersianDigits(category.productCount)} محصول در این دسته
              </p>
            )}
          </div>
        </div>

        {category.description && (
          <p className="mt-6 max-w-3xl text-sm leading-8 text-ink-500">{category.description}</p>
        )}

        {hasChildren && (
          <section className="mt-10">
            <h2 className="mb-5 text-base font-bold text-ink-800 md:text-lg">زیردسته‌ها</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/categories/${child.slug}`}
                  className="flex flex-col items-center gap-3 rounded-card bg-surface p-5 text-center transition-shadow hover:shadow-card"
                >
                  <span className="relative grid h-14 w-14 place-items-center">
                    {child.imageUrl ? (
                      <Image src={child.imageUrl} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
                    ) : (
                      <span className="grid size-14 place-items-center rounded-full bg-white text-base font-bold text-ink-400">
                        {child.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-bold text-ink-800">{child.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-bold text-ink-800 md:text-lg">
            محصولات {category.name}
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
            hasChildren ? (
              <p className="rounded-card bg-surface px-6 py-10 text-center text-sm text-ink-500">
                محصولی مستقیماً در «{category.name}» ثبت نشده — از زیردسته‌های بالا محصول موردنظر
                خود را پیدا کنید.
              </p>
            ) : (
              <CatalogEmptyState query="" />
            )
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {catalogResult.data.items.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 4} />
                ))}
              </div>

              <CatalogPagination params={catalogParams} pagination={catalogResult.data.pagination} />

              <p className="mt-10 text-center text-sm text-ink-500">
                برای فیلتر بیشتر (برند، خودرو، قیمت) به{' '}
                <Link
                  href={`/products?category=${category.slug}`}
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
