'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { VehicleSummary } from '@edalat/shared';
import { toPersianDigits } from '@edalat/shared';

import { ButtonLink } from '@/components/ui/button';
import { CarIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch } from '@/lib/auth';

/**
 * PRD §26/§31 — Dashboard → «خودروهای من». Structurally identical to
 * `dashboard/favorites/page.tsx`, just on saved vehicles instead of
 * favorited products. Fed by `SaveVehicleButton` on the vehicle detail
 * page; the explicit «حذف» button below is a second, unambiguous way to
 * remove one without relying on that button's own (session-only) state.
 */
export default function DashboardMyVehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch<VehicleSummary[]>('/saved-vehicles');
      setVehicles(data);
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/login?next=%2Fdashboard%2Fmy-vehicles');
        return;
      }
      setError(err instanceof Error ? err.message : 'بارگذاری خودروهای من ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (vehicleId: string) => {
    setRemovingId(vehicleId);
    try {
      await authFetch(`/saved-vehicles/${vehicleId}`, { method: 'DELETE' });
      setVehicles((current) => (current ?? []).filter((v) => v.id !== vehicleId));
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/login?next=%2Fdashboard%2Fmy-vehicles');
      }
      // best-effort — the list simply keeps the item if the request failed
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-card bg-surface px-6 py-14 text-center">
        <p className="text-sm leading-8 text-ink-500">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 rounded-pill bg-brand-500 px-6 py-2.5 text-sm font-bold text-ink-900"
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="rounded-card bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white">
          <CarIcon className="size-8 text-ink-400" aria-hidden />
        </span>
        <h2 className="mt-6 text-lg font-bold text-ink-800">هنوز خودرویی ذخیره نکرده‌اید</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
          با دکمه «ذخیره در خودروهای من» روی صفحه هر خودرو، آن را اینجا ذخیره کنید.
        </p>
        <ButtonLink href="/vehicles" size="lg" className="mt-8">
          مشاهده اطلاعات خودرو
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((vehicle) => {
        const title = [vehicle.brand.name, vehicle.model, vehicle.generation]
          .filter(Boolean)
          .join(' ');
        return (
          <li key={vehicle.id} className="flex flex-col gap-3 rounded-card bg-surface p-5">
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
            <button
              type="button"
              onClick={() => void remove(vehicle.id)}
              disabled={removingId === vehicle.id}
              className="self-start text-xs font-bold text-red-600 underline-offset-4 hover:underline disabled:opacity-50"
            >
              {removingId === vehicle.id ? 'در حال حذف…' : 'حذف از خودروهای من'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
