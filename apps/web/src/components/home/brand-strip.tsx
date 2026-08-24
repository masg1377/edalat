import Image from 'next/image';
import Link from 'next/link';

import { SectionHeading } from './section-heading';

interface BrandItem {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  logoUrl: string | null;
}

export function BrandStrip({ brands }: { brands: BrandItem[] }) {
  if (brands.length === 0) return null;

  return (
    <section className="container-page mt-24">
      <SectionHeading title="برند های معتبر و سازگار" />

      <ul className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-8">
        {brands.slice(0, 8).map((brand) => (
          <li key={brand.id}>
            <Link
              href={`/vehicles/${brand.slug}`}
              className="flex flex-col items-center gap-3 rounded-card p-3 transition-colors hover:bg-surface"
            >
              <span className="relative grid h-16 w-16 place-items-center">
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt={brand.nameEn ?? brand.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 object-contain"
                  />
                ) : (
                  <span className="grid size-16 place-items-center rounded-full bg-surface text-lg font-bold text-ink-400">
                    {(brand.nameEn ?? brand.name).charAt(0)}
                  </span>
                )}
              </span>
              <span className="text-center text-sm font-bold text-ink-800">
                {brand.nameEn ?? brand.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
