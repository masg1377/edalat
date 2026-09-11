'use client';

import { useEffect, useState } from 'react';

import { CarIcon } from '@/components/ui/icons';
import { authFetch, getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface SaveVehicleButtonProps {
  vehicleId: string;
  className?: string;
  iconClassName?: string;
}

/**
 * PRD §26 — «خودروی من»: the save toggle that feeds `/dashboard/my-vehicles`.
 * Structurally identical to `favorite-button.tsx`, just on `Vehicle`
 * instead of `Product` (see `saved-vehicles.module.ts` for the backend
 * mirror of `FavoritesModule`).
 *
 * The vehicle detail response itself is still cached and shared across
 * users (`FavoriteButton` has the same constraint), so it carries no
 * per-user "isSaved" flag baked in. Bug fix: this button used to start
 * `useState(false)` unconditionally, so a vehicle that genuinely was saved
 * showed as unsaved every time the detail page was reloaded/revisited —
 * only the same session that clicked "save" still showed it filled. Now it
 * fetches its own real state client-side on mount via
 * `GET /saved-vehicles/:vehicleId`, which keeps the page response cacheable
 * while still reflecting the truth for a logged-in viewer.
 */
export function SaveVehicleButton({ vehicleId, className, iconClassName }: SaveVehicleButtonProps) {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!getSession()) return;

    let cancelled = false;
    authFetch<{ saved: boolean }>(`/saved-vehicles/${vehicleId}`)
      .then((result) => {
        if (!cancelled) setSaved(result.saved);
      })
      .catch(() => {
        /* best-effort — falls back to the unfilled default on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!getSession()) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const next = !saved;
    setSaved(next); // optimistic — should feel instant
    setPending(true);
    try {
      await authFetch(`/saved-vehicles/${vehicleId}`, { method: next ? 'POST' : 'DELETE' });
    } catch {
      setSaved(!next); // revert on failure
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => void toggle(event)}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? 'حذف از خودروهای من' : 'ذخیره در خودروهای من'}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border border-ink-200 bg-white px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60',
        saved ? 'text-brand-600' : 'text-ink-600',
        className,
      )}
    >
      <CarIcon
        className={cn('size-4 transition-colors', saved ? 'text-brand-600' : 'text-ink-400', iconClassName)}
      />
      {saved ? 'در خودروهای من' : 'ذخیره در خودروهای من'}
    </button>
  );
}
