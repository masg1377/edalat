import Image from 'next/image';
import Link from 'next/link';
import type { VehicleSummary } from '@edalat/shared';
import { toPersianDigits } from '@edalat/shared';

import { ButtonLink } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon, CarIcon } from '@/components/ui/icons';

/**
 * PRD §26 — "my vehicle". Once a customer has told us what they drive, the
 * home page can lead with parts that actually fit, instead of a generic grid.
 */
export function VehiclePanel({ vehicle }: { vehicle: VehicleSummary | null }) {
  return (
    <section className="container-page mt-24">
      <div className="relative overflow-hidden rounded-card bg-surface-soft p-8 shadow-card md:p-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="heading-rule relative text-xl font-bold text-ink-800 md:text-2xl">
              اطلاعات خودروی شما
            </h2>
            <p className="mt-4 text-sm leading-8 text-ink-500">
              قطعات این بخش با خودروی شما سازگار هستند.
              <br />
              برای مشاهده قطعات مناسب ، اطلاعات خودرو را تأیید کنید.
            </p>

            {vehicle ? (
              <>
                <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Fact label="برند" value={vehicle.brand.name} />
                  <Fact label="نام" value={vehicle.model} />
                  <Fact
                    label="مدل"
                    value={vehicle.generation ?? (vehicle.yearFrom ? toPersianDigits(vehicle.yearFrom) : '—')}
                  />
                </dl>

                <ButtonLink href={`/vehicles/${vehicle.slug}`} size="lg" className="mt-8 w-full">
                  مشاهده همه سازگاری ها
                </ButtonLink>
              </>
            ) : (
              <div className="mt-8">
                <p className="text-sm text-ink-500">
                  هنوز خودرویی ثبت نکرده‌اید. با ثبت خودرو، قطعات سازگار همیشه در اولویت نمایش قرار
                  می‌گیرند.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/vehicles" size="lg">
                    انتخاب خودرو
                  </ButtonLink>
                  <Link
                    href="/product-request"
                    className="inline-flex h-14 items-center justify-center rounded-pill px-6 text-sm text-ink-600 underline-offset-4 hover:underline"
                  >
                    خودرو را پیدا نمی‌کنید؟ عکس قطعه را بفرستید
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="relative aspect-[16/10] w-full">
              {vehicle ? (
                <Image
                  src={`/vehicles/${vehicle.slug}.png`}
                  alt={`${vehicle.brand.name} ${vehicle.model}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                />
              ) : (
                <div className="grid size-full place-items-center rounded-card bg-surface text-ink-300">
                  <CarIcon className="size-24" />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center gap-4 lg:justify-start">
              <button
                type="button"
                aria-label="خودرو قبلی"
                className="grid size-12 place-items-center rounded-full bg-white shadow-card transition-colors hover:bg-ink-50"
              >
                <ArrowRightIcon className="size-5 text-ink-700" />
              </button>
              <button
                type="button"
                aria-label="خودرو بعدی"
                className="grid size-12 place-items-center rounded-full bg-white shadow-card transition-colors hover:bg-ink-50"
              >
                <ArrowLeftIcon className="size-5 text-ink-700" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-white px-4 py-3 shadow-card">
      <CarIcon className="size-7 shrink-0 text-ink-500" />
      <div>
        <dt className="text-xs text-ink-500">{label}:</dt>
        <dd className="font-bold text-ink-800">{value}</dd>
      </div>
    </div>
  );
}
