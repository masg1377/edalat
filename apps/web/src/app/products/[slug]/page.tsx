import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { toPersianDigits } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { CompatibilityTable } from '@/components/product/compatibility-table';
import { FavoriteButton } from '@/components/product/favorite-button';
import { ProductCard } from '@/components/product/product-card';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductReviews } from '@/components/product/product-reviews';
import { ProductTabs } from '@/components/product/product-tabs';
import { PurchaseBox } from '@/components/product/purchase-box';
import { ApiError, api, safe } from '@/lib/api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await safe(api.products.bySlug(slug), null);
  if (!product) return { title: 'محصول یافت نشد' };

  const title = product.name;
  const description =
    product.description ??
    `${product.name}${product.technicalCode ? ` با کد فنی ${product.technicalCode}` : ''} — قیمت خرده و عمده، خودروهای سازگار و بازه تعویض.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/products/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${product.slug}`,
      images: product.mainImageUrl ? [product.mainImageUrl] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await api.products.bySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const specEntries = Object.entries(product.specifications ?? {});

  // PRD §36 — APPROVED reviews for the "نظرات کاربران" tab, fetched
  // server-side so the tab has content on first paint (see ProductReviews).
  const reviews = await safe(api.products.reviews(product.id, { limit: 20 }), {
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false },
    averageRating: 0,
  });

  // PRD §62 — structured data so a part number search on Google lands here.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    mpn: product.technicalCode ?? undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    description: product.description ?? undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRR',
      price: product.retailPrice,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${product.slug}`,
    },
  };

  return (
    <>
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="container-page pb-16 pt-8">
        <nav aria-label="مسیر صفحه" className="mb-8 text-sm text-ink-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink-800">خانه</Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href="/products" className="hover:text-ink-800">محصولات</Link>
            </li>
            {product.category && (
              <>
                <li aria-hidden>›</li>
                <li>
                  <Link
                    href={`/products?category=${product.category.slug}`}
                    className="hover:text-ink-800"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden>›</li>
            <li className="font-bold text-ink-800" aria-current="page">{product.name}</li>
          </ol>
        </nav>

        {/* Gallery on the left, identity + purchase on the right (RTL). */}
        <div className="grid gap-10 lg:grid-cols-[1fr_460px]">
          <div className="order-2 lg:order-1">
            <ProductGallery
              images={product.images}
              alt={product.name}
              badge={product.ratingCount > 0 && product.ratingAverage >= 4.5 ? 'پرفروش' : null}
            />
          </div>

          <div className="order-1 lg:order-2">
            <div className="flex items-center justify-between gap-3">
              {product.category ? (
                <span className="inline-block rounded-pill bg-surface px-4 py-1.5 text-xs text-ink-600">
                  {product.category.name}
                </span>
              ) : (
                <span />
              )}
              <FavoriteButton
                productId={product.id}
                className="size-11 border border-ink-200 bg-white"
                iconClassName="size-5"
              />
            </div>

            <h1 className="mt-4 text-xl font-black leading-relaxed text-ink-800 md:text-2xl">
              {product.name}
            </h1>

            {product.description && (
              <p className="mt-3 line-clamp-2 text-sm text-ink-500">{product.description}</p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Fact label="کد فنی" value={product.technicalCode} ltr />
              <Fact label="SKU" value={product.sku} ltr />
              <Fact label="برند" value={product.brand?.name ?? null} />
              <Fact
                label="وضعیت"
                value={product.inStock ? 'موجود در انبار' : 'ناموجود'}
              />
              {product.oemCodes.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-ink-500">کدهای OEM</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {product.oemCodes.map((code) => (
                      <span
                        key={code}
                        className="ltr-num rounded-lg bg-surface px-2.5 py-1 text-xs text-ink-700"
                      >
                        {code}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-7">
              <PurchaseBox product={product} />
            </div>

            {/* Figma order (right-to-left reading): ارسال سریع, ضمانت اصالت, ۷ روز
               ضمانت بازگشت, پشتیبانی تخصصی — list order matches so the RTL flex
               row renders the same reading order as the design. */}
            <ul className="mt-6 flex flex-wrap justify-between gap-4 text-xs text-ink-500">
              <li>ارسال سریع</li>
              <li>ضمانت اصالت کالا</li>
              <li>۷ روز ضمانت بازگشت کالا</li>
              <li>پشتیبانی تخصصی</li>
            </ul>
          </div>
        </div>

        {/* Tabs on the left, compatibility on the right */}
        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_420px]">
          <div className="order-2 min-w-0 lg:order-1">
            <ProductTabs
              tabs={[
                {
                  id: 'description',
                  label: 'توضیحات',
                  content: (
                    <div className="text-sm leading-8 text-ink-600">
                      {product.description ?? 'توضیحی برای این محصول ثبت نشده است.'}
                    </div>
                  ),
                },
                {
                  id: 'specs',
                  label: 'مشخصات فنی',
                  content:
                    specEntries.length > 0 ? (
                      <table className="w-full text-sm">
                        <tbody>
                          {specEntries.map(([key, value]) => (
                            <tr key={key} className="border-b border-ink-100 last:border-b-0">
                              <th scope="row" className="w-1/3 py-3 text-start font-normal text-ink-500">
                                {key}
                              </th>
                              <td className="py-3 text-ink-800">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-ink-500">مشخصات فنی هنوز ثبت نشده است.</p>
                    ),
                },
                {
                  id: 'reviews',
                  label: 'نظرات کاربران',
                  content: <ProductReviews productId={product.id} initial={reviews} />,
                },
                {
                  id: 'replacement',
                  label: 'زمان تعویض',
                  content: <ReplacementPanel product={product} />,
                },
                {
                  id: 'shipping',
                  label: 'ارسال و بازگشت',
                  content: (
                    <ul className="space-y-3 text-sm leading-8 text-ink-600">
                      <li>ارسال به سراسر کشور، ۲۴ تا ۴۸ ساعت پس از ثبت سفارش.</li>
                      <li>امکان بازگشت کالا تا ۷ روز در صورت سالم بودن بسته‌بندی.</li>
                      <li>سفارش‌های عمده با هماهنگی کارشناس فروش ارسال می‌شوند.</li>
                    </ul>
                  ),
                },
              ]}
            />
          </div>

          <div className="order-1 lg:order-2">
            <CompatibilityTable vehicles={product.compatibleVehicles} productSlug={product.slug} />
          </div>
        </div>

        {/* PRD §27 — the two B2B promo cards from the design */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <PromoCard
            title="تولید اختصاصی با برند شما"
            subtitle="طراحی، تولید و بسته‌بندی اختصاصی"
            points={['امکان چاپ لوگو', 'بسته‌بندی سفارشی', 'حداقل تیراژ و قیمت رقابتی']}
            href="/manufacturing/request"
          />
          <PromoCard
            title="تأمین مستقیم از کارخانه"
            subtitle="حذف واسطه‌ها و بهترین قیمت بازار"
            points={['کاهش هزینه برای همکاران', 'تضمین اصالت و کیفیت', 'تحویل سریع و منظم']}
            href="/wholesale"
          />
        </div>

        {(product.relatedProducts.length > 0 || product.similarProducts.length > 0) && (
          <section className="mt-16">
            <h2 className="mb-8 text-xl font-bold text-ink-800 md:text-2xl">محصولات پیشنهادی</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...product.relatedProducts, ...product.similarProducts]
                .slice(0, 4)
                .map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}

function Fact({ label, value, ltr }: { label: string; value: string | null; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className={`mt-0.5 font-bold text-ink-800 ${ltr ? 'ltr-num' : ''}`}>{value ?? '—'}</dd>
    </div>
  );
}

/** PRD §21/§22 — replacement interval plus the conditions disclaimer. */
function ReplacementPanel({ product }: { product: { replacement: { km: number | null; kmMax: number | null; months: number | null; notes: string | null } | null } }) {
  const r = product.replacement;
  if (!r) return <p className="text-sm text-ink-500">بازه تعویض برای این محصول ثبت نشده است.</p>;

  return (
    <div className="text-sm leading-8 text-ink-600">
      {r.km && (
        <p className="text-base font-bold text-ink-800">
          تعویض پیشنهادی: هر{' '}
          <span className="ltr-num">
            {toPersianDigits(r.km.toLocaleString('en-US'))}
            {r.kmMax ? ` تا ${toPersianDigits(r.kmMax.toLocaleString('en-US'))}` : ''}
          </span>{' '}
          کیلومتر
        </p>
      )}
      {r.months && <p className="mt-2">یا حداکثر هر {toPersianDigits(r.months)} ماه.</p>}
      <p className="mt-4 rounded-xl bg-brand-500/15 px-4 py-3 text-xs leading-7 text-ink-700">
        {r.notes ??
          'این بازه تقریبی است و بسته به شرایط رانندگی، آب‌وهوا، نوع موتور و توصیه سازنده خودرو می‌تواند متفاوت باشد.'}
      </p>
    </div>
  );
}

function PromoCard({
  title,
  subtitle,
  points,
  href,
}: {
  title: string;
  subtitle: string;
  points: string[];
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card bg-surface p-7 transition-shadow hover:shadow-card"
    >
      <h3 className="text-lg font-bold text-ink-800">{title}</h3>
      <p className="mt-2 text-sm text-ink-500">{subtitle}</p>
      <ul className="mt-5 space-y-2.5 text-sm text-ink-600">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-500 text-[11px] text-ink-900">
              ✓
            </span>
            {point}
          </li>
        ))}
      </ul>
      <span className="mt-6 text-sm font-bold text-ink-800 underline-offset-4 group-hover:underline">
        اطلاعات بیشتر
      </span>
    </Link>
  );
}
