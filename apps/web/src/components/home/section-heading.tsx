import Link from 'next/link';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  moreHref?: string;
  moreLabel?: string;
  className?: string;
  rule?: boolean;
}

export function SectionHeading({
  title,
  moreHref,
  moreLabel = 'مشاهده بیشتر',
  className,
  rule = false,
}: SectionHeadingProps) {
  return (
    <div className={cn('mb-8 flex items-center justify-between gap-4', className)}>
      <h2 className={cn('relative text-xl font-bold text-ink-800 md:text-2xl', rule && 'heading-rule')}>
        {title}
      </h2>
      {moreHref && (
        <Link
          href={moreHref}
          className="shrink-0 rounded-pill bg-brand-500 px-6 py-2.5 text-sm font-bold text-ink-900 transition-colors hover:bg-brand-400"
        >
          {moreLabel}
        </Link>
      )}
    </div>
  );
}
