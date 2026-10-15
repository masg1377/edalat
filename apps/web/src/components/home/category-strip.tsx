import Image from 'next/image';
import Link from 'next/link';
import type { CategorySummary } from '@edalat/shared';

import { SectionHeading } from './section-heading';
import { categoryAssets } from '@/lib/design-assets';

export function CategoryStrip({ categories }: { categories: CategorySummary[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="category-section container-page">
      <SectionHeading title="دسته بندی محصولات" />

      <div className="category-grid">
        {categories.slice(0, 4).map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.slug}`}
            className="category-card group relative flex items-start justify-between bg-surface transition-shadow hover:shadow-card"
          >
            <div className="relative z-10 flex h-full flex-col justify-between">
              <span className="category-name">{category.name}</span>
              <span className="w-fit rounded-pill bg-sand px-5 py-1.5 text-xs text-ink-700 transition-colors group-hover:bg-brand-500">
                ادامه
              </span>
            </div>

            {(category.imageUrl || categoryAssets[category.slug]) && (
              <Image
                src={category.imageUrl || categoryAssets[category.slug]}
                alt=""
                width={173}
                height={210}
                className="category-image transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </Link>
        ))}
        <Link href="/products" className="category-more">
          مشاهده بیشتر
        </Link>
      </div>
    </section>
  );
}
