import Image from 'next/image';
import Link from 'next/link';
import type { ProductSummary } from '@edalat/shared';
import { formatToman, toPersianDigits } from '@edalat/shared';

import { FavoriteButton } from '@/components/product/favorite-button';
import { ButtonLink } from '@/components/ui/button';
import { CarIcon, StarIcon } from '@/components/ui/icons';
import { productImage } from '@/lib/media';

interface ProductCardProps {
  product: ProductSummary;
  /** Grid position — the first row is above the fold and loads eagerly. */
  priority?: boolean;
  compact?: boolean;
}

export function ProductCard({ product, priority = false, compact = false }: ProductCardProps) {
  const image = productImage(product.mainImageUrl, product.slug, product.category?.slug);

  return (
    <article
      className={`product-card ${compact ? 'home-product-card' : 'catalog-product-card'} group flex h-full flex-col rounded-card transition-shadow focus-within:shadow-card hover:shadow-card`}
    >
      {/* Fixed aspect ratio keeps the grid from shifting as images arrive. */}
      <div
        className={`product-photo relative aspect-square ${compact ? '' : 'bg-white rounded-t-card'}`}
      >
        <Link
          href={`/products/${product.slug}`}
          tabIndex={-1}
          aria-hidden
          className="absolute inset-0 block"
        >
          <Image
            src={image.src}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className={
              image.isPlaceholder
                ? 'object-contain p-10 opacity-60'
                : 'object-contain p-6 transition-transform duration-300 group-hover:scale-105'
            }
          />

          {!product.inStock && (
            <span className="absolute top-3 end-3 rounded-full bg-ink-600 px-3 py-1 text-[11px] text-white">
              ناموجود
            </span>
          )}
        </Link>

        {/* Sibling of the (decorative, aria-hidden) image link, not nested in
            it — a real interactive control inside an aria-hidden link would
            be unreachable for assistive tech. */}
        {!compact && (
          <FavoriteButton
            productId={product.id}
            className="catalog-favorite absolute end-3 top-3 size-9"
            iconClassName="text-red-500"
          />
        )}
      </div>

      <div className="product-card-body flex flex-1 flex-col p-5">
        {!compact && (
          <div className="card-purchase-links">
            <Link href={`/products/${product.slug}`}>خرده</Link>
            {product.lowestWholesalePrice !== null && (
              <Link href={`/products?purchaseType=WHOLESALE&q=${encodeURIComponent(product.name)}`}>
                عمده
              </Link>
            )}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0">
            <Link
              href={`/products/${product.slug}`}
              className="line-clamp-2 font-bold text-ink-800 transition-colors hover:text-brand-600"
            >
              {product.name}
            </Link>
          </h3>

          {product.ratingCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-sm text-ink-500">
              <StarIcon className="size-4 text-brand-500" aria-hidden />
              <span className="ltr-num">{toPersianDigits(product.ratingAverage.toFixed(1))}</span>
              <span className="sr-only">
                از ۵، بر اساس {toPersianDigits(product.ratingCount)} نظر
              </span>
            </span>
          )}
        </div>

        {/* Part numbers are latin — isolate them so RTL does not reverse them. */}
        {!compact && product.technicalCode && (
          <p className="mt-2 text-xs text-ink-500">
            کد فنی:{' '}
            <span className="ltr-num font-medium text-ink-700">{product.technicalCode}</span>
          </p>
        )}

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span className="truncate text-sm text-ink-500">
            برند: <b className="text-ink-800">{product.brand?.name ?? '—'}</b>
          </span>
          <span className="shrink-0 font-bold text-ink-800">
            <span className="ltr-num">{formatToman(product.retailPrice)}</span>
            <span className="ms-1 text-xs font-normal text-ink-500">تومان</span>
          </span>
        </div>

        {/* Rule 1 — wholesale is a separate price. This is a display-only floor
            from the backend; the billable price comes from the pricing quote. */}
        {!compact && product.lowestWholesalePrice !== null && (
          <p className="mt-2 text-xs text-ink-500">
            عمده از{' '}
            <b className="ltr-num text-ink-700">{formatToman(product.lowestWholesalePrice)}</b>{' '}
            تومان
            {product.minWholesaleQuantity !== null && (
              <> — حداقل {toPersianDigits(product.minWholesaleQuantity)} عدد</>
            )}
          </p>
        )}

        {!compact && product.compatibleVehicleCount > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
            <CarIcon className="size-4 shrink-0" aria-hidden />
            مناسب {toPersianDigits(product.compatibleVehicleCount)} خودرو
          </p>
        )}

        {/* `mt-auto` pins the CTA to the bottom so buttons line up across a row
            whose titles wrap to different numbers of lines. */}
        <div className="mt-auto pt-6">
          <ButtonLink
            href={
              !compact && product.inStock
                ? `/cart?${new URLSearchParams({ add: product.id, quantity: '1', purchaseType: 'RETAIL' }).toString()}`
                : `/products/${product.slug}`
            }
            className="w-full"
            size="md"
          >
            {!compact && product.inStock ? 'افزودن به سبد خرید' : 'مشاهده محصول'}
            <span className="sr-only"> — {product.name}</span>
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
