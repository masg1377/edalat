'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { OrderDetail, OrderStatus } from '@edalat/shared';
import { formatToman, toPersianDigits } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button, ButtonLink } from '@/components/ui/button';
import { AuthRequiredError, authFetch, getSession } from '@/lib/auth';
import { productImage } from '@/lib/media';

/**
 * PRD §35 — order status / confirmation page. Doubles as the immediate
 * post-checkout confirmation (linked to from `/checkout` after the mock
 * payment step) and, from phase 6 on, the detail view opened from the user's
 * order history in the dashboard — hence living at the dashboard-shaped
 * `/orders/{id}` route already, per the phase 5 task note.
 */

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'در انتظار بررسی',
  AWAITING_PAYMENT: 'در انتظار پرداخت',
  PAID: 'پرداخت‌شده',
  PROCESSING: 'در حال پردازش',
  PACKED: 'بسته‌بندی‌شده',
  SHIPPED: 'ارسال‌شده',
  DELIVERED: 'تحویل داده‌شده',
  CANCELLED: 'لغوشده',
  RETURNED: 'مرجوع‌شده',
};

const STATUS_TONES: Record<OrderStatus, string> = {
  PENDING: 'bg-sand text-ink-700',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-sand text-ink-700',
  PACKED: 'bg-sand text-ink-700',
  SHIPPED: 'bg-sand text-ink-700',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-red-100 text-red-700',
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    router.replace(`/login?next=${encodeURIComponent(`/orders/${orderId}`)}`);
  }, [router, orderId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch<OrderDetail>(`/orders/${orderId}`);
      setOrder(data);
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : 'سفارش بارگذاری نشد.');
    } finally {
      setLoading(false);
    }
  }, [orderId, redirectToLogin]);

  useEffect(() => {
    if (!getSession()) {
      redirectToLogin();
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="container-page pb-16 pt-8">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="h-8 w-56 animate-pulse rounded-full bg-surface" />
            <div className="h-72 animate-pulse rounded-card bg-surface" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Header />
        <main className="container-page pb-16 pt-8">
          <div role="alert" className="mx-auto max-w-lg rounded-card bg-surface px-6 py-16 text-center">
            <h1 className="text-lg font-bold text-ink-800">سفارش پیدا نشد</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-ink-500">
              {error ?? 'سفارش موردنظر یافت نشد.'}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => void load()}>
                تلاش دوباره
              </Button>
              <ButtonLink href="/products" variant="muted" size="lg">
                بازگشت به فروشگاه
              </ButtonLink>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const mockPayment = order.payments.find((p) => p.gateway === 'MOCK');

  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <div className="mx-auto max-w-2xl">
          {order.status === 'PAID' && (
            <div className="mb-6 flex items-center gap-3 rounded-card bg-brand-500/15 px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-sm">
                ✓
              </span>
              <p className="text-sm font-bold text-ink-800">سفارش شما با موفقیت ثبت و پرداخت شد.</p>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-ink-800 md:text-2xl">
                سفارش <span className="ltr-num">{order.orderNumber}</span>
              </h1>
              <p className="mt-1 text-xs text-ink-500">
                ثبت‌شده در{' '}
                <span className="ltr-num">
                  {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                </span>
              </p>
            </div>
            <span className={`rounded-pill px-4 py-1.5 text-xs font-bold ${STATUS_TONES[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          {mockPayment && (
            <div className="mt-5 rounded-xl border border-ink-200 bg-white px-4 py-3 text-xs leading-6 text-ink-600">
              پرداخت این سفارش با <b>محیط آزمایشی/دمو</b> (Mock) تأیید شده و مبلغ واقعی جابه‌جا نشده
              است.
            </div>
          )}

          <div className="mt-6 rounded-card bg-surface p-6 md:p-7">
            <h2 className="font-bold text-ink-800">اقلام سفارش</h2>
            <ul className="mt-4 divide-y divide-ink-200">
              {order.items.map((item) => {
                const image = productImage(null);
                return (
                  <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white">
                      <Image
                        src={image.src}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-2 opacity-60"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink-800">{item.productName}</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {item.technicalCode && (
                          <>
                            <span className="ltr-num">{item.technicalCode}</span> ·{' '}
                          </>
                        )}
                        <span className="ltr-num">{toPersianDigits(item.quantity)}</span> عدد ×{' '}
                        <span className="ltr-num">{formatToman(item.unitPrice)}</span> تومان
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-ink-800">
                      <span className="ltr-num">{formatToman(item.lineTotal)}</span>
                    </p>
                  </li>
                );
              })}
            </ul>

            {order.address && (
              <div className="mt-5 rounded-xl bg-white p-4 text-sm">
                <p className="font-bold text-ink-800">آدرس تحویل</p>
                <p className="mt-1 text-xs leading-7 text-ink-500">
                  {order.address.recipientName} · <span className="ltr-num">{order.address.phone}</span>
                  <br />
                  {order.address.province}، {order.address.city} — {order.address.line}
                </p>
                {order.shippingMethod && (
                  <p className="mt-2 text-xs text-ink-500">روش ارسال: {order.shippingMethod}</p>
                )}
              </div>
            )}

            <dl className="mt-5 space-y-3 border-t border-ink-200 pt-5 text-sm">
              <Row label="جمع مبلغ کالاها" value={order.subtotal} />
              {order.discountTotal > 0 && <Row label="تخفیف" value={-order.discountTotal} tone="text-green-700" />}
              <Row label="هزینه ارسال" value={order.shippingTotal} freeLabel />
              {order.taxTotal > 0 && <Row label="مالیات" value={order.taxTotal} />}
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-4">
              <span className="font-bold text-ink-800">مبلغ نهایی</span>
              <span className="text-lg font-black text-ink-800">
                <span className="ltr-num">{formatToman(order.grandTotal)}</span>
                <span className="ms-1 text-xs font-normal text-ink-500">تومان</span>
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/products" size="lg">
              ادامه خرید
            </ButtonLink>
            <Link
              href="/"
              className="inline-flex h-14 items-center justify-center rounded-pill bg-sand px-7 font-bold text-ink-800"
            >
              بازگشت به صفحه اصلی
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function Row({
  label,
  value,
  tone,
  freeLabel,
}: {
  label: string;
  value: number;
  tone?: string;
  freeLabel?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className={tone ?? 'text-ink-800'}>
        {freeLabel && value === 0 ? (
          'رایگان'
        ) : (
          <>
            <span className="ltr-num">{formatToman(value)}</span>
            <span className="ms-1 text-xs text-ink-500">تومان</span>
          </>
        )}
      </dd>
    </div>
  );
}
