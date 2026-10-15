import Image from 'next/image';
import Link from 'next/link';

import { SectionHeading } from './section-heading';
import { vehicleBrandAssets } from '@/lib/design-assets';

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
    <section className="brand-section container-page">
      <SectionHeading title="برند های معتبر و سازگار" />

      <ul className="brand-grid">
        {brands.slice(0, 8).map((brand) => (
          <li key={brand.id}>
            <Link
              href={`/products?vehicleBrand=${brand.slug}`}
              className="brand-link flex flex-col items-center rounded-card transition-colors hover:bg-surface"
            >
              <span className="brand-logo relative grid place-items-center">
                {brand.logoUrl || vehicleBrandAssets[brand.slug] ? (
                  <Image
                    src={brand.logoUrl || vehicleBrandAssets[brand.slug]}
                    alt={brand.nameEn ?? brand.name}
                    width={130}
                    height={130}
                    className={`brand-logo-image brand-${brand.slug} object-contain`}
                  />
                ) : (
                  <span className="grid size-16 place-items-center rounded-full bg-surface text-lg font-bold text-ink-400">
                    {(brand.nameEn ?? brand.name).charAt(0)}
                  </span>
                )}
              </span>
              <span className="brand-name text-center font-bold text-ink-800" dir="ltr">
                {brand.nameEn ?? brand.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
