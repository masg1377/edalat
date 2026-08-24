import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Wordmark from the Figma design: two stacked words, the first in brand
 * yellow. Rendered as text rather than an image so it stays crisp and
 * searchable; swap in the official SVG when the brand file is available.
 */
export function Logo({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'text-2xl leading-[1.15]',
    md: 'text-4xl leading-[1.1]',
    lg: 'text-5xl leading-[1.05]',
  };

  return (
    <Link href="/" aria-label="عدالت فیلتر — صفحه اصلی" className={cn('inline-block', className)}>
      <span className={cn('block font-black', sizes[size])}>
        <span className="block text-brand-500">عدالت</span>
        <span className="block text-ink-700">فیلتر</span>
      </span>
    </Link>
  );
}
