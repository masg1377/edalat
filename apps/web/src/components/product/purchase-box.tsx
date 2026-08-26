'use client';

import { useEffect, useState } from 'react';
import type { PriceQuote, ProductDetail } from '@edalat/shared';
import { PurchaseType, formatToman, toPersianDigits } from '@edalat/shared';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * PRD §17/§18 — the retail / wholesale selector.
 *
 * Every price shown here comes from `GET /products/:id/price`, which is the
 * same `PricingService.quote()` that bills the customer. The component holds no
 * pricing rules of its own: it does not know the tiers, the minimum quantity,
 * or how they combine — it asks the server on every quantity change.
 */
export function PurchaseBox({ product }: { product: ProductDetail }) {
  const hasWholesale = product.wholesaleTiers.length > 0;
  const minWholesale = product.minWholesaleQuantity ?? 1;

  const [mode, setMode] = useState<PurchaseType>(PurchaseType.RETAIL);
  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Switching to wholesale jumps the quantity to the minimum the server allows,
  // otherwise the first quote would always come back as a validation error.
  const switchMode = (next: PurchaseType) => {
    setMode(next);
    setQuantity(next === PurchaseType.WHOLESALE ? minWholesale : 1);
  };

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    api.products
      .price(product.id, quantity, mode)
      .then((result) => {
        if (cancelled) return;
        setQuote(result);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setQuote(null);
        setError(err.message);
      })
      .finally(() => !cancelled && setPending(false));

    return () => {
      cancelled = true;
    };
  }, [product.id, quantity, mode]);

  const step = mode === PurchaseType.WHOLESALE ? Math.max(1, Math.floor(minWholesale / 4)) : 1;
  const floor = mode === PurchaseType.WHOLESALE ? minWholesale : 1;

  return (
    <section aria-label="خرید محصول" className="rounded-card bg-surface p-6 md:p-7">
      {/* Mode selector */}
      <div
        role="radiogroup"
        aria-label="نوع خرید"
        className="grid grid-cols-2 gap-3"
      >
        {[
          { value: PurchaseType.RETAIL, label: 'خرید خرده', hint: 'تکی و چند عددی' },
          {
            value: PurchaseType.WHOLESALE,
            label: 'خرید عمده',
            hint: hasWholesale ? `از ${toPersianDigits(minWholesale)} عدد به بالا` : 'برای این محصول تعریف نشده',
          },
        ].map((option) => {
          const disabled = option.value === PurchaseType.WHOLESALE && !hasWholesale;
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => switchMode(option.value)}
              className={cn(
                'rounded-card px-4 py-4 text-center transition-colors',
                active ? 'bg-brand-500 text-ink-900' : 'bg-white text-ink-700 hover:bg-ink-50',
                disabled && 'cursor-not-allowed opacity-50 hover:bg-white',
              )}
            >
              <span className="block font-bold">{option.label}</span>
              <span className={cn('mt-1 block text-[11px]', active ? 'text-ink-800' : 'text-ink-400')}>
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>

      {/* Price */}
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-ink-500">
            {mode === PurchaseType.WHOLESALE ? 'قیمت هر عدد (عمده)' : 'قیمت هر عدد'}
          </p>
          <p className={cn('mt-1 text-2xl font-black text-ink-800', pending && 'opacity-40')}>
            <span className="ltr-num">
              {formatToman(quote?.unitPrice ?? product.retailPrice)}
            </span>
            <span className="ms-1.5 text-sm font-normal text-ink-500">تومان</span>
          </p>
        </div>

        {quote && quantity > 1 && (
          <div className="text-left">
            <p className="text-xs text-ink-500">مبلغ کل</p>
            <p className="mt-1 text-lg font-bold text-ink-800">
              <span className="ltr-num">{formatToman(quote.total)}</span>
              <span className="ms-1 text-xs font-normal text-ink-500">تومان</span>
            </p>
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="mt-6 flex items-center gap-3">
        <span className="text-sm text-ink-500">تعداد:</span>
        <div className="flex items-center gap-1 rounded-pill bg-white p-1">
          <button
            type="button"
            aria-label="کاهش تعداد"
            onClick={() => setQuantity((q) => Math.max(floor, q - step))}
            disabled={quantity <= floor}
            className="grid size-10 place-items-center rounded-full text-lg font-bold text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-30"
          >
            −
          </button>
          <input
            type="number"
            value={quantity}
            min={floor}
            aria-label="تعداد"
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setQuantity(Number.isNaN(next) ? floor : Math.max(1, next));
            }}
            className="ltr-num h-10 w-16 bg-transparent text-center font-bold text-ink-800 outline-none"
          />
          <button
            type="button"
            aria-label="افزایش تعداد"
            onClick={() => setQuantity((q) => q + step)}
            className="grid size-10 place-items-center rounded-full text-lg font-bold text-ink-700 transition-colors hover:bg-ink-50"
          >
            +
          </button>
        </div>

        <span className="text-xs text-ink-400">
          {product.inStock ? `موجودی: ${toPersianDigits(product.availableQuantity)}` : 'ناموجود'}
        </span>
      </div>

      {/* PRD §18 — the server tells us the next quantity break; surface it. */}
      {quote?.nextTier && (
        <p className="mt-4 rounded-xl bg-brand-500/15 px-4 py-3 text-xs leading-6 text-ink-700">
          با خرید {toPersianDigits(quote.nextTier.minQuantity)} عدد یا بیشتر، قیمت هر عدد{' '}
          <b className="ltr-num">{formatToman(quote.nextTier.unitPrice)}</b> تومان می‌شود.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs leading-6 text-red-700">
          {error}
        </p>
      )}

      <Button
        size="lg"
        disabled={!product.inStock || !quote || pending}
        className="mt-6 w-full"
        onClick={() => {
          // Cart mutations require an account; the cart page handles the login
          // hand-off, so the product page only carries the intent across.
          const params = new URLSearchParams({
            add: product.id,
            quantity: String(quantity),
            purchaseType: mode,
          });
          window.location.href = `/cart?${params.toString()}`;
        }}
      >
        {product.inStock ? 'افزودن به سبد خرید' : 'ناموجود'}
      </Button>

      {/* PRD §18 — full tier table, so a wholesale buyer sees the whole ladder. */}
      {hasWholesale && mode === PurchaseType.WHOLESALE && (
        <table className="mt-6 w-full text-xs">
          <caption className="mb-2 text-start text-ink-500">پلکان قیمت عمده</caption>
          <thead>
            <tr className="text-ink-400">
              <th scope="col" className="pb-2 text-start font-normal">تعداد</th>
              <th scope="col" className="pb-2 text-start font-normal">قیمت هر عدد</th>
            </tr>
          </thead>
          <tbody>
            {product.wholesaleTiers.map((tier) => (
              <tr
                key={tier.minQuantity}
                className={cn(
                  'border-t border-ink-100',
                  quote?.appliedTier?.minQuantity === tier.minQuantity && 'font-bold text-ink-900',
                )}
              >
                <td className="py-2">
                  <span className="ltr-num">
                    {toPersianDigits(tier.minQuantity)}
                    {tier.maxQuantity ? ` – ${toPersianDigits(tier.maxQuantity)}` : ' +'}
                  </span>
                </td>
                <td className="py-2">
                  <span className="ltr-num">{formatToman(tier.unitPrice)}</span> تومان
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
