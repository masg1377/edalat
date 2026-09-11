import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { VehicleSummary } from '@edalat/shared';
import { toPersianDigits } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import { CarIcon } from '@/components/ui/icons';
import { ApiError, api, safe } from '@/lib/api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await safe(api.products.bySlug(slug), null);
  if (!product) return { title: 'محصول یافت نشد' };

  const title = `خودروهای سازگار با ${product.name}`;
  const description = `فهرست کامل خودروهایی که ${product.name}${product.technicalCode ? ` (کد فنی ${product.technicalCode})` : ''} برای آن‌ها قابل استفاده است.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/products/${product.slug}/vehicles` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${product.slug}/vehicles`,
    },
  };
}

/**
 * PRD §20 — «این قطعه با چه خودروهای دیگری مشترک است». `CompatibilityTable`
 * on the product detail page only shows the first 6 rows and links here for
 * the rest; `product.compatibleVehicles` from `bySlug` already carries the
 * full, un-truncated list (see apps/api mapProductDetail), so this page just
 * renders all of it rather than calling a separate endpoint.
 */
export default async function ProductVehiclesPage({ params }: PageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await api.products.bySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const vehicles = product.compatibleVehicles;

  return (
    <>
      <Header />

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
            <li aria-hidden>›</li>
            <li>
              <Link href={`/products/${product.slug}`} className="hover:text-ink-800">
                {product.name}
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li className="font-bold text-ink-800" aria-current="page">همهٔ خودروهای سازگار</li>
          </ol>
        </nav>

        <h1 className="text-xl font-black leading-relaxed text-ink-800 md:text-2xl">
          همهٔ خودروهای سازگار با {product.name}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {vehicles.length > 0
            ? `${toPersianDigits(vehicles.length)} خودرو سازگار`
            : 'سازگاری این محصول هنوز ثبت نشده است.'}
        </p>

        {vehicles.length === 0 ? (
          <div className="mt-8 rounded-card bg-surface px-6 py-16 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-white">
              <CarIcon className="size-8 text-ink-400" aria-hidden />
            </span>
            <h2 className="mt-6 text-lg font-bold text-ink-800">هنوز خودرویی برای این محصول ثبت نشده است</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
              می‌توانید سازگاری این محصول با خودروی خود را از بخش اطلاعات خودرو بررسی کنید.
            </p>
            <ButtonLink href="/vehicles" size="lg" className="mt-8">
              مشاهده اطلاعات خودرو
            </ButtonLink>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </>
  );
}

function VehicleCard({ vehicle }: { vehicle: VehicleSummary }) {
  const title = [vehicle.brand.name, vehicle.model, vehicle.generation].filter(Boolean).join(' ');

  return (
    <li className="rounded-card bg-surface p-5">
      <Link href={`/vehicles/${vehicle.slug}`} className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink-500">
          <CarIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-ink-800">{title}</p>
          {(vehicle.yearFrom || vehicle.engine) && (
            <p className="mt-1 text-xs text-ink-500">
              {vehicle.yearFrom && (
                <span className="ltr-num">
                  {toPersianDigits(vehicle.yearFrom)}
                  {vehicle.yearTo ? ` – ${toPersianDigits(vehicle.yearTo)}` : ' به بعد'}
                </span>
              )}
              {vehicle.yearFrom && vehicle.engine ? ' · ' : ''}
              {vehicle.engine && <span className="ltr-num">{vehicle.engine}</span>}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
