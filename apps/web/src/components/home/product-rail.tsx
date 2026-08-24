import Link from 'next/link';
import type { ProductSummary } from '@edalat/shared';

import { ProductCard } from '@/components/product/product-card';
import { SectionHeading } from './section-heading';

interface ProductRailProps {
  title: string;
  products: ProductSummary[];
  moreHref?: string;
}

export function ProductRail({ title, products, moreHref }: ProductRailProps) {
  return (
    <section className="container-page mt-24">
      <SectionHeading title={title} moreHref={moreHref} />

      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* PRD §74 — an empty state is a conversion opportunity, not a dead end. */
        <div className="rounded-card bg-surface p-12 text-center">
          <p className="text-lg font-bold text-ink-800">هنوز محصولی در این بخش نیست</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-500">
            دنبال قطعه خاصی هستید؟ از آن عکس بفرستید تا کارشناسان ما پیدایش کنند.
          </p>
          <Link
            href="/product-request"
            className="mt-6 inline-flex h-12 items-center rounded-pill bg-brand-500 px-7 font-bold text-ink-900 transition-colors hover:bg-brand-400"
          >
            ارسال تصویر محصول
          </Link>
        </div>
      )}
    </section>
  );
}
