import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { toPersianDigits } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import { CarIcon } from '@/components/ui/icons';
import { VehicleJumpSelector } from '@/components/vehicle/vehicle-jump-selector';
import { VehiclesErrorState } from '@/components/vehicle/vehicles-error-state';
import { api, attempt } from '@/lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'اطلاعات خودرو',
  description:
    'برند و مدل خودروی خود را انتخاب کنید تا فیلتر روغن، هوا، کابین و سوخت مناسب آن، بازه تعویض و قطعات سازگار را ببینید.',
  alternates: { canonical: `${SITE_URL}/vehicles` },
  openGraph: {
    title: 'اطلاعات خودرو — عدالت فیلتر',
    description: 'مرجع تخصصی اطلاعات خودرو و قطعات سازگار.',
    url: `${SITE_URL}/vehicles`,
  },
};

/**
 * PRD §23 — «صفحه Vehicle Information یک Knowledge Base مستقل است، نه صرفاً
 * فیلتر فروشگاه»: مستقل از کاتالوگ، برند خودرو را نشان می‌دهد و اجازه می‌دهد
 * کاربر یا از میان برندها مرور کند یا مستقیم با selector مشترک به یک خودروی
 * مشخص برود (§25).
 */
export default async function VehiclesPage() {
  const brandsResult = await attempt(api.vehicles.brands());

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
              اطلاعات خودرو
            </li>
          </ol>
        </nav>

        <h1 className="text-2xl font-black text-ink-800 md:text-3xl">اطلاعات خودرو</h1>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-ink-500">
          خودروی خود را از میان برندهای زیر پیدا کنید، یا از انتخابگر کنار صفحه مستقیم به مشخصات،
          بازه تعویض فیلترها و قطعات سازگار همان خودرو بروید.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="h-max rounded-card bg-white p-6 shadow-card lg:sticky lg:top-24">
            <h2 className="text-base font-bold text-ink-800">انتخاب مستقیم خودرو</h2>
            <p className="mt-1 text-xs text-ink-500">برند، مدل و تیپ/موتور را انتخاب کنید.</p>
            <div className="mt-5">
              <VehicleJumpSelector brands={brandsResult.ok ? brandsResult.data : []} />
            </div>
          </aside>

          <div className="min-w-0">
            {!brandsResult.ok ? (
              <VehiclesErrorState message={brandsResult.error} />
            ) : brandsResult.data.length === 0 ? (
              <VehiclesEmptyState />
            ) : (
              <>
                <h2 className="mb-6 text-base font-bold text-ink-800">مرور بر اساس برند خودرو</h2>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
                  {brandsResult.data.map((brand) => (
                    <Link
                      key={brand.id}
                      href={`/vehicles/${brand.slug}`}
                      className="flex flex-col items-center gap-3 rounded-card bg-surface p-6 text-center transition-shadow hover:shadow-card"
                    >
                      <span className="relative grid h-16 w-16 place-items-center">
                        {brand.logoUrl ? (
                          <Image
                            src={brand.logoUrl}
                            alt={brand.nameEn ?? brand.name}
                            width={64}
                            height={64}
                            className="h-16 w-16 object-contain"
                          />
                        ) : (
                          <span className="grid size-16 place-items-center rounded-full bg-white text-lg font-bold text-ink-400">
                            {(brand.nameEn ?? brand.name).charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-bold text-ink-800">{brand.name}</span>
                      <span className="text-xs text-ink-500">
                        {toPersianDigits(brand.vehicleCount)} خودرو
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

/** PRD §74/§88 — even an empty knowledge base should not be a dead end. */
function VehiclesEmptyState() {
  return (
    <div className="rounded-card bg-surface px-6 py-16 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-500">
        <CarIcon className="size-8 text-ink-900" aria-hidden />
      </span>
      <h2 className="mt-6 text-lg font-bold text-ink-800 md:text-xl">هنوز خودرویی ثبت نشده است</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-ink-500">
        خودروی خود را برای ما بنویسید تا به پایگاه داده اضافه کنیم، یا مستقیم قطعه موردنظر را با
        عکس یا توضیح جست‌وجو کنید.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <ButtonLink href="/product-request" size="lg">
          ارسال تصویر محصول
        </ButtonLink>
        <ButtonLink href="/products" variant="muted" size="lg">
          مشاهده همه محصولات
        </ButtonLink>
      </div>
    </div>
  );
}
