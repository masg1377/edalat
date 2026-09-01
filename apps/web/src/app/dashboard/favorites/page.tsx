'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ProductSummary } from '@edalat/shared';

import { ProductCard } from '@/components/product/product-card';
import { ButtonLink } from '@/components/ui/button';
import { HeartIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch } from '@/lib/auth';

/**
 * PRD §31/§37 — Dashboard → Favorites. Was permanently empty before phase 6:
 * `GET /favorites` didn't exist and nothing in the UI ever called
 * `POST /favorites/:productId` (the header already linked here regardless).
 * The heart toggle on `ProductCard`/product detail (also phase 6) is what
 * feeds this list; the explicit "حذف" button below is a second, unambiguous
 * way to remove one without relying on that heart's own (session-only,
 * see `favorite-button.tsx`) favorited state.
 */
export default function DashboardFavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<ProductSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch<ProductSummary[]>('/favorites');
      setFavorites(data);
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/login?next=%2Fdashboard%2Ffavorites');
        return;
      }
      setError(err instanceof Error ? err.message : 'بارگذاری علاقه‌مندی‌ها ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (productId: string) => {
    setRemovingId(productId);
    try {
      await authFetch(`/favorites/${productId}`, { method: 'DELETE' });
      setFavorites((current) => (current ?? []).filter((p) => p.id !== productId));
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/login?next=%2Fdashboard%2Ffavorites');
      }
      // best-effort — the list simply keeps the item if the request failed
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-card bg-surface px-6 py-14 text-center">
        <p className="text-sm leading-8 text-ink-500">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 rounded-pill bg-brand-500 px-6 py-2.5 text-sm font-bold text-ink-900"
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="rounded-card bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white">
          <HeartIcon className="size-8 text-ink-400" aria-hidden />
        </span>
        <h2 className="mt-6 text-lg font-bold text-ink-800">هنوز محصولی را علاقه‌مند نکرده‌اید</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
          با ضربه روی آیکون قلب روی هر محصول، آن را اینجا ذخیره کنید.
        </p>
        <ButtonLink href="/products" size="lg" className="mt-8">
          مشاهده محصولات
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {favorites.map((product) => (
        <li key={product.id} className="flex flex-col gap-2">
          <ProductCard product={product} />
          <button
            type="button"
            onClick={() => void remove(product.id)}
            disabled={removingId === product.id}
            className="text-xs font-bold text-red-600 underline-offset-4 hover:underline disabled:opacity-50"
          >
            {removingId === product.id ? 'در حال حذف…' : 'حذف از علاقه‌مندی‌ها'}
          </button>
        </li>
      ))}
    </ul>
  );
}
