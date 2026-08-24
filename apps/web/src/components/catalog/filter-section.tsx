import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-ink-100 py-5 last:border-b-0">
      <h3 className="mb-3 text-sm font-bold text-ink-800">{title}</h3>
      {children}
    </section>
  );
}

interface FilterOptionProps {
  href: string;
  label: string;
  count?: number;
  active: boolean;
  /** Persian digit rendering for the count, supplied by the caller. */
  countLabel?: string;
}

/**
 * A filter choice is a link, not a checkbox handler.
 *
 * That keeps the URL authoritative, makes every filtered view server-rendered
 * and shareable, and means the control still works before hydration.
 */
export function FilterOption({ href, label, active, countLabel }: FilterOptionProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-brand-500 font-bold text-ink-900'
          : 'text-ink-600 hover:bg-ink-50 hover:text-ink-800',
      )}
    >
      <span className="truncate">{label}</span>
      {countLabel && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11px]',
            active ? 'bg-ink-900/10 text-ink-900' : 'bg-ink-50 text-ink-500',
          )}
        >
          {countLabel}
        </span>
      )}
    </Link>
  );
}
