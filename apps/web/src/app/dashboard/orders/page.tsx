'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { OrderSummary } from '@edalat/shared';
import { formatToman, toPersianDigits } from '@edalat/shared';

import { ButtonLink } from '@/components/ui/button';
import { CartIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch } from '@/lib/auth';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '@/lib/status-labels';

/** PRD §31 — Dashboard → Orders. Links straight into `/orders/[id]`, built in
 * phase 5 — nothing here duplicates that page. */
export default function DashboardOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch<OrderSummary[]>('/orders');
      setOrders(data);
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/login?next=%2Fdashboard%2Forders');
        return;
      }
      setError(err instanceof Error ? err.message : 'بارگذاری سفارش‌ها ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-card bg-surface" />
        <div className="h-24 animate-pulse rounded-card bg-surface" />
        <div className="h-24 animate-pulse rounded-card bg-surface" />
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

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-card bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white">
          <CartIcon className="size-8 text-ink-400" aria-hidden />
        </span>
        <h2 className="mt-6 text-lg font-bold text-ink-800">هنوز سفارشی ثبت نکرده‌اید</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
          محصولات موردنیاز خود را پیدا کنید و اولین سفارش خود را ثبت کنید.
        </p>
        <ButtonLink href="/products" size="lg" className="mt-8">
          مشاهده محصولات
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/orders/${order.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface p-5 transition-colors hover:bg-ink-100"
          >
            <div>
              <p className="font-bold text-ink-800">
                سفارش <span className="ltr-num">{order.orderNumber}</span>
              </p>
              <p className="mt-1 text-xs text-ink-500">
                <span className="ltr-num">
                  {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                </span>{' '}
                · <span className="ltr-num">{toPersianDigits(order.itemCount)}</span> قلم
                {order.trackingCode && (
                  <>
                    {' '}
                    · کد رهگیری: <span className="ltr-num">{order.trackingCode}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-ink-800">
                <span className="ltr-num">{formatToman(order.grandTotal)}</span>
                <span className="ms-1 text-xs font-normal text-ink-500">تومان</span>
              </span>
              <span className={`rounded-pill px-3 py-1 text-xs font-bold ${ORDER_STATUS_TONES[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
