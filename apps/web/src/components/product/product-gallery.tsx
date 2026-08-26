'use client';

import Image from 'next/image';
import { useState } from 'react';

import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';
import { productImage } from '@/lib/media';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  /** Shown as a badge over the image, e.g. "پرفروش". */
  badge?: string | null;
}

export function ProductGallery({ images, alt, badge }: ProductGalleryProps) {
  const slides = images.length > 0 ? images : [null];
  const [index, setIndex] = useState(0);
  const current = productImage(slides[index]);

  const go = (delta: number) => setIndex((i) => (i + delta + slides.length) % slides.length);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-card bg-surface">
        <Image
          src={current.src}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 440px"
          priority
          className={current.isPlaceholder ? 'object-contain p-20 opacity-60' : 'object-contain p-10'}
        />

        {badge && (
          <span className="absolute top-4 end-4 rounded-pill bg-brand-500 px-4 py-1.5 text-xs font-bold text-ink-900">
            {badge}
          </span>
        )}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="تصویر قبلی"
              className="absolute end-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-700 shadow-card transition-colors hover:bg-white"
            >
              <ArrowRightIcon className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="تصویر بعدی"
              className="absolute start-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-700 shadow-card transition-colors hover:bg-white"
            >
              <ArrowLeftIcon className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <ul className="mt-4 flex gap-3">
          {slides.map((src, i) => {
            const thumb = productImage(src);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`تصویر ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    'relative size-20 overflow-hidden rounded-xl bg-surface transition-all',
                    i === index ? 'ring-2 ring-brand-500' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <Image src={thumb.src} alt="" fill sizes="80px" className="object-contain p-2" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
