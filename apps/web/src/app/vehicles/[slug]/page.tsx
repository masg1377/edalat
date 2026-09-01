import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ProductSummary, VehicleDetail } from '@edalat/shared';
import { toPersianDigits } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import { CarIcon } from '@/components/ui/icons';
import { ProductCard } from '@/components/product/product-card';
import { VehicleJumpSelector } from '@/components/vehicle/vehicle-jump-selector';
import type { VehicleBrandOption } from '@/components/vehicle/vehicle-selector';
import { ApiError, api, safe } from '@/lib/api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const FUEL_LABELS: Record<string, string> = {
  PETROL: 'بنزینی',
  DIESEL: 'دیزلی',
  HYBRID: 'هیبرید',
  ELECTRIC: 'برقی',
  CNG: 'گازسوز CNG',
  LPG: 'گازسوز LPG',
};

const TRANSMISSION_LABELS: Record<string, string> = {
  MANUAL: 'دنده‌ای',
  AUTOMATIC: 'اتوماتیک',
  CVT: 'اتوماتیک CVT',
  DCT: 'دوکلاچه (DCT)',
};

/**
 * PRD §5/§63 puts both a vehicle detail (`/vehicles/{slug}`) and a brand
 * listing (`/vehicles/{brand}`) one segment below `/vehicles`. Next.js does
 * not allow two dynamic segment names at the same level (`[slug]` vs.
 * `[brandSlug]`), so both live in this one `[slug]` route: resolve it as a
 * vehicle first (the common case — every internal link, e.g.
 * `compatibility-table.tsx`, points at a vehicle slug), and only if that 404s
 * fall back to treating the segment as a vehicle-brand slug. A brand slug
 * colliding with a vehicle slug is not prevented at the data layer, but in
 * practice vehicle slugs are always brand+model+engine compounds
 * (`peugeot-206-tu5`), so this is a documented, low-risk trade-off rather
 * than a real ambiguity.
 */
async function findVehicle(slug: string): Promise<VehicleDetail | null> {
  try {
    return await api.vehicles.bySlugOrId(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function findBrand(slug: string): Promise<VehicleBrandOption & { logoUrl: string | null; vehicleCount: number } | null> {
  const brands = await safe(api.vehicles.brands(), []);
  return brands.find((brand) => brand.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const vehicle = await findVehicle(slug);
  if (vehicle) {
    const title = [vehicle.brand.name, vehicle.model, vehicle.generation].filter(Boolean).join(' ');
    const description = `فیلتر روغن، هوا، کابین و سوخت مناسب ${title}، بازه تعویض و قطعات سازگار در عدالت فیلتر.`;
    return {
      title,
      description,
      alternates: { canonical: `${SITE_URL}/vehicles/${vehicle.slug}` },
      openGraph: { title, description, url: `${SITE_URL}/vehicles/${vehicle.slug}` },
    };
  }

  const brand = await findBrand(slug);
  if (brand) {
    return {
      title: `خودروهای ${brand.name}`,
      description: `فهرست مدل‌های ${brand.name} و قطعات سازگار با هر مدل.`,
      alternates: { canonical: `${SITE_URL}/vehicles/${brand.slug}` },
    };
  }

  return { title: 'خودرو یافت نشد' };
}

export default async function VehicleOrBrandPage({ params }: PageProps) {
  const { slug } = await params;

  const vehicle = await findVehicle(slug);
  if (vehicle) return <VehicleDetailView vehicle={vehicle} />;

  const brand = await findBrand(slug);
  if (!brand) notFound();

  const models = await safe(api.vehicles.models(brand.slug), []);
  return <BrandModelsView brand={brand} models={models} />;
}

/* ------------------------------------------------------------------ */
/* Vehicle detail — PRD §24                                            */
/* ------------------------------------------------------------------ */

async function VehicleDetailView({ vehicle }: { vehicle: VehicleDetail }) {
  const [groups, allBrands] = await Promise.all([
    safe(api.vehicles.productsGrouped(vehicle.id), []),
    safe(api.vehicles.brands(), []),
  ]);
  const title = [vehicle.brand.name, vehicle.model, vehicle.generation].filter(Boolean).join(' ');
  const specEntries = Object.entries(vehicle.specifications ?? {});
  const totalProducts = groups.reduce((sum, group) => sum + group.items.length, 0);

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
              <Link href="/vehicles" className="hover:text-ink-800">اطلاعات خودرو</Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href={`/vehicles/${vehicle.brand.slug}`} className="hover:text-ink-800">
                {vehicle.brand.name}
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li className="font-bold text-ink-800" aria-current="page">{vehicle.model}</li>
          </ol>
        </nav>

        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-ink-500">
            <CarIcon className="size-6" />
          </span>
          <h1 className="text-xl font-black leading-relaxed text-ink-800 md:text-2xl">{title}</h1>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="order-2 min-w-0 space-y-8 lg:order-1">
            <section className="rounded-card bg-surface-soft p-6 md:p-8">
              <h2 className="text-base font-bold text-ink-800 md:text-lg">مشخصات پایه</h2>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                <Fact label="برند" value={vehicle.brand.name} />
                <Fact label="مدل" value={vehicle.model} />
                <Fact label="نسل" value={vehicle.generation} />
                <Fact
                  label="سال ساخت"
                  value={
                    vehicle.yearFrom
                      ? `${toPersianDigits(vehicle.yearFrom)}${vehicle.yearTo ? ` – ${toPersianDigits(vehicle.yearTo)}` : ' به بعد'}`
                      : null
                  }
                  ltr
                />
                <Fact label="نوع بدنه" value={vehicle.bodyType} />
                <Fact label="موتور" value={vehicle.engine} ltr />
                <Fact label="کد موتور" value={vehicle.engineCode} ltr />
                <Fact
                  label="حجم موتور"
                  value={vehicle.displacement ? `${toPersianDigits(vehicle.displacement)} سی‌سی` : null}
                  ltr
                />
                <Fact label="سوخت" value={vehicle.fuelType ? FUEL_LABELS[vehicle.fuelType] ?? vehicle.fuelType : null} />
                <Fact
                  label="گیربکس"
                  value={vehicle.transmission ? TRANSMISSION_LABELS[vehicle.transmission] ?? vehicle.transmission : null}
                />
              </dl>

              {specEntries.length > 0 && (
                <div className="mt-6 border-t border-ink-100 pt-5">
                  <table className="w-full text-sm">
                    <tbody>
                      {specEntries.map(([key, value]) => (
                        <tr key={key} className="border-b border-ink-100 last:border-b-0">
                          <th scope="row" className="w-1/3 py-3 text-start font-normal text-ink-500">{key}</th>
                          <td className="py-3 text-ink-800">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <ServiceInfoSection service={vehicle.service} />

            <section aria-labelledby="compat-products-heading">
              <h2 id="compat-products-heading" className="text-base font-bold text-ink-800 md:text-lg">
                قطعات سازگار با {vehicle.model}
                {totalProducts > 0 && (
                  <span className="ms-2 text-sm font-normal text-ink-500">
                    ({toPersianDigits(totalProducts)} محصول)
                  </span>
                )}
              </h2>

              {groups.length === 0 ? (
                <div className="mt-5 rounded-card bg-surface px-6 py-14 text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-500">
                    <CarIcon className="size-7 text-ink-900" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-ink-800">
                    هنوز قطعه‌ای برای این خودرو ثبت نشده است
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-8 text-ink-500">
                    قطعه موردنظر خود را با عکس یا توضیح برای ما بفرستید تا آن را برای این خودرو
                    بررسی و اضافه کنیم.
                  </p>
                  <ButtonLink href="/product-request" className="mt-6">
                    ارسال تصویر محصول
                  </ButtonLink>
                </div>
              ) : (
                <div className="mt-5 space-y-10">
                  {groups.map((group) => (
                    <div key={group.categoryId}>
                      <h3 className="mb-4 text-sm font-bold text-ink-700">
                        {group.categoryName}
                        <span className="ms-2 font-normal text-ink-400">
                          ({toPersianDigits(group.items.length)})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((product: ProductSummary) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="order-1 h-max rounded-card bg-white p-6 shadow-card lg:sticky lg:top-24 lg:order-2">
            <h2 className="text-base font-bold text-ink-800">خودروی دیگری دارید؟</h2>
            <p className="mt-1 text-xs text-ink-500">با انتخابگر زیر مستقیم به مشخصات آن بروید.</p>
            <div className="mt-5">
              <VehicleJumpSelector brands={allBrands} />
            </div>
          </aside>
        </div>
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

/** PRD §21/§22 — service info plus the same conditions disclaimer used on Product Detail's "زمان تعویض" tab. */
function ServiceInfoSection({ service }: { service: VehicleDetail['service'] }) {
  return (
    <section aria-labelledby="service-info-heading" className="rounded-card bg-ink-600 p-6 text-white md:p-8">
      <h2 id="service-info-heading" className="text-base font-bold md:text-lg">اطلاعات سرویس و بازه تعویض</h2>

      {!service ? (
        <p className="mt-3 text-sm text-white/70">اطلاعات سرویس این خودرو هنوز ثبت نشده است.</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {service.engineOilGrade && (
              <ServiceStat label="روغن موتور توصیه‌شده" value={service.engineOilGrade} />
            )}
            {service.engineOilCapacityLiters !== null && (
              <ServiceStat
                label="ظرفیت روغن موتور"
                value={`${toPersianDigits(service.engineOilCapacityLiters)} لیتر`}
              />
            )}
            {service.oilChangeKm !== null && (
              <ServiceStat label="تعویض روغن موتور" value={`هر ${toPersianDigits(service.oilChangeKm)} کیلومتر`} />
            )}
            {service.oilFilterChangeKm !== null && (
              <ServiceStat label="تعویض فیلتر روغن" value={`هر ${toPersianDigits(service.oilFilterChangeKm)} کیلومتر`} />
            )}
            {service.airFilterChangeKm !== null && (
              <ServiceStat label="تعویض فیلتر هوا" value={`هر ${toPersianDigits(service.airFilterChangeKm)} کیلومتر`} />
            )}
            {service.cabinFilterChangeKm !== null && (
              <ServiceStat label="تعویض فیلتر کابین" value={`هر ${toPersianDigits(service.cabinFilterChangeKm)} کیلومتر`} />
            )}
            {service.fuelFilterChangeKm !== null && (
              <ServiceStat label="تعویض فیلتر سوخت" value={`هر ${toPersianDigits(service.fuelFilterChangeKm)} کیلومتر`} />
            )}
          </div>

          <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-xs leading-7 text-white/80">
            {service.notes ??
              'این بازه‌ها تقریبی‌اند و بسته به شرایط رانندگی، شرایط آب‌وهوایی، نوع موتور و توصیه سازنده خودرو می‌توانند متفاوت باشند.'}
          </p>
        </>
      )}
    </section>
  );
}

function ServiceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3">
      <dt className="text-xs text-white/60">{label}</dt>
      <dd className="ltr-num mt-1 text-sm font-bold">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Brand → models fallback — PRD §5, optional §63 URL shape             */
/* ------------------------------------------------------------------ */

async function BrandModelsView({
  brand,
  models,
}: {
  brand: VehicleBrandOption & { logoUrl: string | null; vehicleCount: number };
  models: string[];
}) {
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
              <Link href="/vehicles" className="hover:text-ink-800">اطلاعات خودرو</Link>
            </li>
            <li aria-hidden>›</li>
            <li className="font-bold text-ink-800" aria-current="page">{brand.name}</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-black text-ink-800 md:text-3xl">خودروهای {brand.name}</h1>
        <p className="mt-3 text-sm text-ink-500">
          {toPersianDigits(brand.vehicleCount)} خودرو ثبت‌شده برای این برند.
        </p>

        {models.length === 0 ? (
          <div className="mt-10 rounded-card bg-surface px-6 py-16 text-center">
            <h2 className="text-lg font-bold text-ink-800">هنوز مدلی برای این برند ثبت نشده است</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-ink-500">
              قطعه موردنظر خود را برای این برند با عکس یا توضیح برای ما بفرستید.
            </p>
            <ButtonLink href="/product-request" className="mt-6">ارسال تصویر محصول</ButtonLink>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]">
            <aside className="h-max rounded-card bg-white p-6 shadow-card lg:sticky lg:top-24">
              <h2 className="text-base font-bold text-ink-800">انتخاب مدل و تیپ/موتور</h2>
              <p className="mt-1 text-xs text-ink-500">مدل و سپس تیپ/موتور {brand.name} خود را انتخاب کنید.</p>
              <div className="mt-5">
                <VehicleJumpSelector brands={[]} lockedBrand={brand} />
              </div>
            </aside>

            <div>
              <h2 className="mb-4 text-base font-bold text-ink-800">همه مدل‌های {brand.name}</h2>
              <ul className="flex flex-wrap gap-3">
                {models.map((model) => (
                  <li key={model} className="rounded-pill bg-surface px-4 py-2 text-sm text-ink-700">
                    {model}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
