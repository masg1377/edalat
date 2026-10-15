'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import type { Cart, PurchaseType } from '@edalat/shared';
import { formatToman, toPersianDigits } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import { CartIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch, getSession } from '@/lib/auth';
import { productImage } from '@/lib/media';

function CartView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  // The product page hands off "add this" through the URL, so the intent
  // survives the login redirect and is replayed once the session exists.
  const addProductId = searchParams.get('add');
  const addQuantity = Number(searchParams.get('quantity') ?? '1');
  const addPurchaseType = (searchParams.get('purchaseType') ?? 'RETAIL') as PurchaseType;

  const load = useCallback(async () => {
    try {
      const data = await authFetch<Cart>('/cart');
      setCart(data);
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace(
          `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        );
        return;
      }
      setError(err instanceof Error ? err.message : 'سبد خرید بارگذاری نشد.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getSession()) {
      router.replace(
        `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }

    const run = async () => {
      if (addProductId) {
        try {
          await authFetch<Cart>('/cart/items', {
            method: 'POST',
            body: JSON.stringify({
              productId: addProductId,
              quantity: Number.isFinite(addQuantity) ? addQuantity : 1,
              purchaseType: addPurchaseType,
            }),
          });
        } catch (err) {
          if (err instanceof AuthRequiredError) {
            router.replace(
              `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
            );
            return;
          }
          setError(err instanceof Error ? err.message : 'افزودن به سبد ناموفق بود.');
        }
        // Drop the intent from the URL so a refresh does not add it twice.
        router.replace('/cart');
      }
      await load();
    };

    void run();
    // Intentionally runs once per navigation; `load` is stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQuantity = async (itemId: string, quantity: number) => {
    setBusyItem(itemId);
    try {
      const next = await authFetch<Cart>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      setCart(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر تعداد ناموفق بود.');
    } finally {
      setBusyItem(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setBusyItem(itemId);
    try {
      setCart(await authFetch<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف کالا ناموفق بود.');
    } finally {
      setBusyItem(null);
    }
  };

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <>
      <Header cartCount={itemCount} />

      <main className="cart-page container-page pb-16 pt-8">
        <h1 className="text-2xl font-black text-ink-800 md:text-3xl">
          سبد خرید شما
          {cart && cart.items.length > 0 && ` (${toPersianDigits(cart.items.length)} کالا)`}
        </h1>

        {loading ? (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-card bg-surface" />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-card bg-surface" />
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
            <ul className="space-y-4">
              {cart.items.map((item) => {
                const image = productImage(item.product.mainImageUrl, item.product.slug);
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-5 rounded-card bg-surface p-5 sm:flex-row"
                  >
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-white"
                    >
                      <Image
                        src={image.src}
                        alt=""
                        fill
                        sizes="112px"
                        className={
                          image.isPlaceholder
                            ? 'object-contain p-6 opacity-60'
                            : 'object-contain p-3'
                        }
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="font-bold text-ink-800 hover:text-brand-600"
                          >
                            {item.product.name}
                          </Link>
                          <p className="mt-1.5 text-xs text-ink-500">
                            {item.product.brand?.name}
                            {item.product.technicalCode && (
                              <>
                                {' · '}
                                <span className="ltr-num">{item.product.technicalCode}</span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* PRD §33 — purchase type is per line, not per cart. */}
                        <span
                          className={
                            item.purchaseType === 'WHOLESALE'
                              ? 'rounded-pill bg-ink-600 px-3 py-1 text-[11px] text-white'
                              : 'rounded-pill bg-white px-3 py-1 text-[11px] text-ink-600'
                          }
                        >
                          {item.purchaseType === 'WHOLESALE' ? 'خرید عمده' : 'خرید خرده'}
                        </span>
                      </div>

                      {item.warning && (
                        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                          {item.warning}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-1 rounded-pill bg-white p-1">
                          <button
                            type="button"
                            aria-label={`کاهش تعداد ${item.product.name}`}
                            disabled={busyItem === item.id || item.quantity <= 1}
                            onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                            className="grid size-9 place-items-center rounded-full font-bold text-ink-700 hover:bg-ink-50 disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="ltr-num w-10 text-center font-bold text-ink-800">
                            {toPersianDigits(item.quantity)}
                          </span>
                          <button
                            type="button"
                            aria-label={`افزایش تعداد ${item.product.name}`}
                            disabled={busyItem === item.id}
                            onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                            className="grid size-9 place-items-center rounded-full font-bold text-ink-700 hover:bg-ink-50 disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-start">
                          <p className="text-xs text-ink-500">
                            هر عدد <span className="ltr-num">{formatToman(item.unitPrice)}</span>{' '}
                            تومان
                          </p>
                          <p className="mt-0.5 font-bold text-ink-800">
                            <span className="ltr-num">{formatToman(item.lineTotal)}</span>
                            <span className="ms-1 text-xs font-normal text-ink-500">تومان</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={busyItem === item.id}
                          onClick={() => void removeItem(item.id)}
                          className="text-xs text-ink-500 underline underline-offset-4 hover:text-red-600"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <div className="rounded-card bg-surface p-6">
                <h2 className="font-bold text-ink-800">خلاصه سفارش</h2>

                <dl className="mt-5 space-y-3.5 text-sm">
                  <Row label="جمع مبلغ کالاها" value={cart.subtotal} />
                  {cart.discountTotal > 0 && (
                    <Row label="تخفیف کالاها" value={-cart.discountTotal} tone="text-green-700" />
                  )}
                  <Row
                    label="هزینه ارسال"
                    value={cart.shippingTotal}
                    hint="در مرحله پرداخت محاسبه می‌شود"
                  />
                </dl>

                <div className="mt-5 flex items-baseline justify-between border-t border-ink-200 pt-5">
                  <span className="font-bold text-ink-800">مبلغ قابل پرداخت</span>
                  <span className="text-lg font-black text-ink-800">
                    <span className="ltr-num">{formatToman(cart.grandTotal)}</span>
                    <span className="ms-1 text-xs font-normal text-ink-500">تومان</span>
                  </span>
                </div>

                <ButtonLink href="/checkout" size="lg" className="mt-6 w-full">
                  ادامه و پرداخت
                </ButtonLink>

                <Link
                  href="/products"
                  className="mt-3 block text-center text-sm text-ink-500 underline-offset-4 hover:underline"
                >
                  ادامه خرید
                </Link>
              </div>
            </aside>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </main>

      <Footer />
    </>
  );
}

function Row({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">
        {label}
        {hint && <span className="mt-0.5 block text-[11px] text-ink-400">{hint}</span>}
      </dt>
      <dd className={tone ?? 'text-ink-800'}>
        <span className="ltr-num">{formatToman(value)}</span>
        <span className="ms-1 text-xs text-ink-500">تومان</span>
      </dd>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mt-10 rounded-card bg-surface px-6 py-20 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-white">
        <CartIcon className="size-8 text-ink-400" aria-hidden />
      </span>
      <h2 className="mt-6 text-lg font-bold text-ink-800">سبد خرید شما خالی است</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
        هنوز محصولی اضافه نکرده‌اید. اگر قطعه موردنظرتان را پیدا نمی‌کنید، عکسش را بفرستید تا
        برایتان پیدا کنیم.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <ButtonLink href="/products" size="lg">
          مشاهده محصولات
        </ButtonLink>
        <ButtonLink href="/product-request" variant="muted" size="lg">
          ارسال تصویر محصول
        </ButtonLink>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartView />
    </Suspense>
  );
}
