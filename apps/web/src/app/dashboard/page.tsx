'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type {
  ManufacturingRequestSummary,
  OrderSummary,
  ProductIdentificationRequestSummary,
} from '@edalat/shared';
import { formatToman, toPersianDigits } from '@edalat/shared';

import { ButtonLink } from '@/components/ui/button';
import { CarIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch } from '@/lib/auth';
import {
  IDENTIFICATION_STATUS_LABELS,
  IDENTIFICATION_STATUS_TONES,
  MANUFACTURING_STATUS_LABELS,
  MANUFACTURING_STATUS_TONES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
} from '@/lib/status-labels';

/** PRD §31 — Dashboard Overview: recent orders + recent request statuses + a
 * small "My Vehicle" call-out (PRD §26/§83 — P1, so a CTA is enough here). */
export default function DashboardOverviewPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [manufacturing, setManufacturing] = useState<ManufacturingRequestSummary[] | null>(null);
  const [imageRequests, setImageRequests] = useState<ProductIdentificationRequestSummary[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, manufacturingData, imageData] = await Promise.all([
        authFetch<OrderSummary[]>('/orders'),
        authFetch<ManufacturingRequestSummary[]>('/manufacturing/requests'),
        authFetch<ProductIdentificationRequestSummary[]>('/product-requests'),
      ]);
      setOrders(ordersData);
      setManufacturing(manufacturingData);
      setImageRequests(imageData);
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/login?next=%2Fdashboard');
        return;
      }
      setError(err instanceof Error ? err.message : 'بارگذاری اطلاعات ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-card bg-surface" />
        <div className="h-40 animate-pulse rounded-card bg-surface" />
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

  const recentOrders = (orders ?? []).slice(0, 3);
  const recentManufacturing = (manufacturing ?? []).slice(0, 3);
  const recentImageRequests = (imageRequests ?? []).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* My Vehicle CTA — PRD §26 is P1; a full saved-vehicle CRUD is out of
          scope for this phase, this is just a doorway to the Vehicle KB. */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-sand p-6 text-ink-800">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white">
            <CarIcon className="size-6" aria-hidden />
          </span>
          <div>
            <p className="font-bold">خودروی من</p>
            <p className="mt-1 text-xs leading-6 text-ink-500">
              به‌زودی: ذخیره خودروهای خودتان برای پیشنهاد سریع‌تر قطعات مناسب.
            </p>
          </div>
        </div>
        <ButtonLink href="/vehicles" variant="dark" size="sm">
          مشاهده اطلاعات خودرو
        </ButtonLink>
      </div>

      <section className="rounded-card bg-surface p-6 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink-800">سفارش‌های اخیر</h2>
          <Link href="/dashboard/orders" className="text-xs font-bold text-ink-600 underline-offset-4 hover:underline">
            مشاهده همه
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-5 text-sm text-ink-500">هنوز سفارشی ثبت نکرده‌اید.</p>
        ) : (
          <ul className="mt-5 divide-y divide-ink-200">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-bold text-ink-800">
                      سفارش <span className="ltr-num">{order.orderNumber}</span>
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      <span className="ltr-num">{toPersianDigits(order.itemCount)}</span> قلم ·{' '}
                      <span className="ltr-num">{formatToman(order.grandTotal)}</span> تومان
                    </p>
                  </div>
                  <span className={`rounded-pill px-3 py-1 text-xs font-bold ${ORDER_STATUS_TONES[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card bg-surface p-6 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink-800">درخواست‌های تولید اخیر</h2>
          <Link
            href="/dashboard/manufacturing-requests"
            className="text-xs font-bold text-ink-600 underline-offset-4 hover:underline"
          >
            مشاهده همه
          </Link>
        </div>

        {recentManufacturing.length === 0 ? (
          <p className="mt-5 text-sm text-ink-500">هنوز درخواست تولیدی ثبت نکرده‌اید.</p>
        ) : (
          <ul className="mt-5 divide-y divide-ink-200">
            {recentManufacturing.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="font-bold text-ink-800">{request.brandName} — {request.productType}</p>
                  <p className="mt-1 text-xs text-ink-500 ltr-num">{request.referenceNumber}</p>
                </div>
                <span
                  className={`rounded-pill px-3 py-1 text-xs font-bold ${MANUFACTURING_STATUS_TONES[request.status]}`}
                >
                  {MANUFACTURING_STATUS_LABELS[request.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card bg-surface p-6 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink-800">درخواست‌های تصویری اخیر</h2>
          <Link href="/dashboard/requests" className="text-xs font-bold text-ink-600 underline-offset-4 hover:underline">
            مشاهده همه
          </Link>
        </div>

        {recentImageRequests.length === 0 ? (
          <p className="mt-5 text-sm text-ink-500">هنوز تصویری برای شناسایی قطعه ارسال نکرده‌اید.</p>
        ) : (
          <ul className="mt-5 divide-y divide-ink-200">
            {recentImageRequests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="font-bold text-ink-800">
                    {request.possibleCode ?? request.vehicleLabel ?? 'درخواست شناسایی قطعه'}
                  </p>
                  <p className="mt-1 text-xs text-ink-500 ltr-num">{request.referenceNumber}</p>
                </div>
                <span
                  className={`rounded-pill px-3 py-1 text-xs font-bold ${IDENTIFICATION_STATUS_TONES[request.status]}`}
                >
                  {IDENTIFICATION_STATUS_LABELS[request.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
