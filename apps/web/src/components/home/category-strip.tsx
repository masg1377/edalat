import Image from 'next/image';
import Link from 'next/link';
import type { CategorySummary } from '@edalat/shared';

import { SectionHeading } from './section-heading';

export function CategoryStrip({ categories }: { categories: CategorySummary[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="container-page mt-24">
      <SectionHeading title="دسته بندی محصولات" moreHref="/products" />

      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {categories.slice(0, 4).map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.slug}`}
            className="group relative flex h-44 items-start justify-between overflow-hidden rounded-card bg-surface p-5 transition-shadow hover:shadow-card"
          >
            <div className="relative z-10 flex h-full flex-col justify-between">
              <span className="text-lg font-bold text-ink-800">{category.name}</span>
              <span className="w-fit rounded-pill bg-sand px-5 py-1.5 text-xs text-ink-700 transition-colors group-hover:bg-brand-500">
                ادامه
              </span>
            </div>

            {category.imageUrl && (
              <Image
                src={category.imageUrl}
                alt=""
                width={140}
                height={140}
                className="absolute -bottom-2 -start-3 h-36 w-36 object-contain transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
