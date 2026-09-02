import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { toPersianDigits } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import { BoxIcon } from '@/components/ui/icons';
import { api, attempt } from '@/lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'برندها',
  description:
    'فهرست برندهای فیلتر و قطعات مصرفی خودرو موجود در عدالت فیلتر — از برندهای معتبر داخلی و خارجی.',
  alternates: { canonical: `${SITE_URL}/brands` },
  openGraph: {
    title: 'برندها — عدالت فیلتر',
    description: 'فهرست برندهای فیلتر و قطعات مصرفی خودرو.',
    url: `${SITE_URL}/brands`,
  },
};

/**
 * PRD §43 — برند محصول (Mann/Bosch/…)، نه برند خودرو.
 *
 * تا پیش از این فاز، `GET /brands` هیچ‌جای فرانت مصرف نمی‌شد؛ این صفحه اولین
 * مصرف‌کنندهٔ آن است. الگوی گرید از `/vehicles` (برند خودرو) عاریت گرفته شده،
 * چون همان شکل بصری (لوگو + نام + شمارنده) اینجا هم درست است.
 */
export default async function BrandsPage() {
  const brandsResult = await attempt(api.brands.list());

  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <nav aria-label="مسیر صفحه" className="mb-6 text-sm text-ink-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink-800">
                خانه
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li className="font-bold text-ink-800" aria-current="page">
              برندها
            </li>
          </ol>
        </nav>

        <h1 className="text-2xl font-black text-ink-800 md:text-3xl">برندهای فیلتر و قطعات</h1>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-ink-500">
          محصولات عدالت فیلتر از برندهای معتبر داخلی و خارجی تأمین می‌شود. برند موردنظر خود را
          انتخاب کنید تا فهرست محصولات همان برند را ببینید.
        </p>

        {!brandsResult.ok ? (
          <BrandsErrorState message={brandsResult.error} />
        ) : brandsResult.data.length === 0 ? (
          <BrandsEmptyState />
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
            {brandsResult.data.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="flex flex-col items-center gap-3 rounded-card bg-surface p-6 text-center transition-shadow hover:shadow-card"
              >
                <span className="relative grid h-16 w-16 place-items-center">
                  {brand.logoUrl ? (
                    <Image
                      src={brand.logoUrl}
                      alt={brand.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 object-contain"
                    />
                  ) : (
                    <span className="grid size-16 place-items-center rounded-full bg-white text-lg font-bold text-ink-400">
                      {brand.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="text-sm font-bold text-ink-800">{brand.name}</span>
                <span className="text-xs text-ink-500">
                  {toPersianDigits(brand.productCount)} محصول
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

function BrandsEmptyState() {
  return (
    <div className="mt-10 rounded-card bg-surface px-6 py-16 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-500">
        <BoxIcon className="size-8 text-ink-900" aria-hidden />
      </span>
      <h2 className="mt-6 text-lg font-bold text-ink-800 md:text-xl">هنوز برندی ثبت نشده است</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-ink-500">
        محصولات به‌زودی با برندهای معتبر در این صفحه نمایش داده می‌شوند.
      </p>
      <ButtonLink href="/products" variant="muted" size="lg" className="mt-6">
        مشاهده همه محصولات
      </ButtonLink>
    </div>
  );
}

function BrandsErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="mt-10 rounded-card bg-surface px-6 py-16 text-center">
      <h2 className="text-lg font-bold text-ink-800 md:text-xl">فهرست برندها بارگذاری نشد</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-ink-500">{message}</p>
      <ButtonLink href="/products" variant="muted" size="lg" className="mt-6">
        مشاهده همه محصولات
      </ButtonLink>
    </div>
  );
}
