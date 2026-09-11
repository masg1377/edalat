'use client';

import { useState } from 'react';

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
 * Same session-only caveat as `FavoriteButton`: the vehicle detail response
 * is cached and shared across users, so it carries no per-user "isSaved"
 * flag — this button starts unfilled and reflects only what happens in the
 * current session. `/dashboard/my-vehicles` (GET /saved-vehicles) is the
 * source of truth for what's actually saved.
 */
export function SaveVehicleButton({ vehicleId, className, iconClassName }: SaveVehicleButtonProps) {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

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
