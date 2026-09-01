'use client';

import { useState } from 'react';

import { HeartIcon } from '@/components/ui/icons';
import { authFetch, getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  iconClassName?: string;
}

/**
 * PRD §37 — the favorite toggle that feeds `/dashboard/favorites`. Without
 * this, that tab has no way to ever contain anything (GET /favorites exists,
 * nothing ever called POST /favorites/:productId).
 *
 * Catalog and product-detail responses are cached and shared across users
 * (`revalidate: 60`/`300`, PRD §64), so neither carries a per-user
 * "isFavorited" flag — adding one would mean joining favorites into every
 * cached catalog/product query. This button therefore starts unfilled and
 * reflects only what happens in the current session; `/dashboard/favorites`
 * (GET /favorites) is the source of truth for what's actually saved. Documented
 * as a known limitation in `claude/وضعیت-پیاده‌سازی.md`, "شناسایی فاز ۶".
 */
export function FavoriteButton({ productId, className, iconClassName }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!getSession()) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const next = !favorited;
    setFavorited(next); // optimistic — a favorite toggle should feel instant
    setPending(true);
    try {
      await authFetch(`/favorites/${productId}`, { method: next ? 'POST' : 'DELETE' });
    } catch {
      setFavorited(!next); // revert on failure
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => void toggle(event)}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
      className={cn(
        'grid place-items-center rounded-full bg-white/90 backdrop-blur transition-colors disabled:opacity-60',
        className,
      )}
    >
      <HeartIcon
        className={cn(
          'size-4 transition-colors',
          favorited ? 'fill-current text-red-500' : 'text-ink-400',
          iconClassName,
        )}
      />
    </button>
  );
}
