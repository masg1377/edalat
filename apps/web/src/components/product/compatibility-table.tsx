import Link from 'next/link';
import type { VehicleSummary } from '@edalat/shared';
import { toPersianDigits } from '@edalat/shared';

import { ButtonLink } from '@/components/ui/button';

/**
 * PRD §19/§20 — which cars this part fits.
 *
 * The heading is deliberately the PRD's framing: a technical code is usually
 * shared across several vehicles, and saying so is what turns a parts lookup
 * into a reason to trust the catalogue.
 */
export function CompatibilityTable({
  vehicles,
  productSlug,
}: {
  vehicles: VehicleSummary[];
  productSlug: string;
}) {
  return (
    <section aria-labelledby="compat-heading" className="rounded-card bg-ink-600 p-6 text-white md:p-7">
      <h2 id="compat-heading" className="text-base font-bold md:text-lg">
        این کد فنی برای چند خودرو قابل استفاده است
      </h2>
      <p className="mt-2 text-xs text-white/70">
        {vehicles.length > 0
          ? `${toPersianDigits(vehicles.length)} خودرو سازگار`
          : 'سازگاری این محصول هنوز ثبت نشده است.'}
      </p>

      {vehicles.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-xs text-white/60">
                <th scope="col" className="pb-3 text-start font-normal">برند</th>
                <th scope="col" className="pb-3 text-start font-normal">مدل</th>
                <th scope="col" className="pb-3 text-start font-normal">سال ساخت</th>
                <th scope="col" className="pb-3 text-start font-normal">موتور</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.slice(0, 6).map((vehicle) => (
                <tr key={vehicle.id} className="border-t border-white/10">
                  <td className="py-3">{vehicle.brand.name}</td>
                  <td className="py-3">
                    <Link href={`/vehicles/${vehicle.slug}`} className="hover:text-brand-500">
                      {vehicle.model}
                    </Link>
                  </td>
                  <td className="py-3">
                    <span className="ltr-num">
                      {vehicle.yearFrom ? toPersianDigits(vehicle.yearFrom) : '—'}
                      {vehicle.yearTo ? ` – ${toPersianDigits(vehicle.yearTo)}` : vehicle.yearFrom ? ' به بعد' : ''}
                    </span>
                  </td>
                  <td className="py-3">{vehicle.engine ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ButtonLink
        href={vehicles.length > 0 ? `/products/${productSlug}/vehicles` : '/vehicles'}
        className="mt-6 w-full"
      >
        {vehicles.length > 6
          ? `مشاهده هر ${toPersianDigits(vehicles.length)} خودرو`
          : 'انتخاب خودرو و مشاهده قطعات'}
      </ButtonLink>
    </section>
  );
}
