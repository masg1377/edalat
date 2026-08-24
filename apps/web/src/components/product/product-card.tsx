import Image from 'next/image';
import Link from 'next/link';
import type { ProductSummary } from '@edalat/shared';
import { formatToman, toPersianDigits } from '@edalat/shared';

import { ButtonLink } from '@/components/ui/button';
import { StarIcon } from '@/components/ui/icons';

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-card bg-surface transition-shadow hover:shadow-card">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square bg-white">
        {product.mainImageUrl ? (
          <Image
            src={product.mainImageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-sm text-ink-300">بدون تصویر</div>
        )}

        {!product.inStock && (
          <span className="absolute top-3 end-3 rounded-full bg-ink-600 px-3 py-1 text-[11px] text-white">
            ناموجود
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/products/${product.slug}`}
            className="line-clamp-2 font-bold text-ink-800 transition-colors hover:text-brand-600"
          >
            {product.name}
          </Link>

          <span className="flex shrink-0 items-center gap-1 text-sm text-ink-500">
            <StarIcon className="size-4 text-brand-500" />
            <span className="ltr-num">({toPersianDigits(product.ratingAverage.toFixed(1))})</span>
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span className="text-sm text-ink-500">
            برند: <b className="text-ink-800">{product.brand?.name ?? '—'}</b>
          </span>
          <span className="font-bold text-ink-800">
            <span className="ltr-num">{formatToman(product.retailPrice)}</span>
            <span className="ms-1 text-xs font-normal text-ink-500">تومان</span>
          </span>
        </div>

        {/* Rule 1 — wholesale is a different price, shown as its own line. */}
        {product.lowestWholesalePrice !== null && (
          <p className="mt-2 text-xs text-ink-500">
            عمده از{' '}
            <b className="ltr-num text-ink-700">{formatToman(product.lowestWholesalePrice)}</b> تومان
            {product.minWholesaleQuantity !== null && (
              <> — حداقل {toPersianDigits(product.minWholesaleQuantity)} عدد</>
            )}
          </p>
        )}

        <ButtonLink href={`/products/${product.slug}`} className="mt-5 w-full" size="md">
          مشاهده محصول
        </ButtonLink>
      </div>
    </article>
  );
}
