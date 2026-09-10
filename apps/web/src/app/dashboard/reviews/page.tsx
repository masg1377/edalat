'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { MyReviewSummary } from '@edalat/shared';

import { ButtonLink } from '@/components/ui/button';
import { StarIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch } from '@/lib/auth';
import { productImage } from '@/lib/media';
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_TONES } from '@/lib/status-labels';

/**
 * PRD §31/§36 — Dashboard → "نظرات من". Was a disabled "به‌زودی" row in
 * `dashboard/layout.tsx` since phase 6 because the reviews backend didn't
 * exist yet (`claude/وضعیت-پیاده‌سازی.md`) — فاز ۹د fills it in, reusing the
 * exact list-page shape of `dashboard/favorites` and
 * `dashboard/manufacturing-requests`.
 */
export default function DashboardReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<MyReviewSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch<MyReviewSummary[]>('/reviews/mine');
      setReviews(data);
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/login?next=%2Fdashboard%2Freviews');
        return;
      }
      setError(err instanceof Error ? err.message : 'بارگذاری نظرات ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-card bg-surface" />
        <div className="h-28 animate-pulse rounded-card bg-surface" />
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

  if (!reviews || reviews.length === 0) {
    return (
      <div className="rounded-card bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white">
          <StarIcon className="size-8 text-ink-400" aria-hidden />
        </span>
        <h2 className="mt-6 text-lg font-bold text-ink-800">هنوز نظری ثبت نکرده‌اید</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
          پس از خرید و استفاده از محصولات، تجربه‌تان را با دیگران به اشتراک بگذارید.
        </p>
        <ButtonLink href="/products" size="lg" className="mt-8">
          مشاهده محصولات
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-card bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white">
                <Image
                  src={productImage(review.productImageUrl).src}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                />
              </div>
              <div>
                <p className="font-bold text-ink-800">{review.productName}</p>
                <div className="mt-1 flex items-center gap-0.5" aria-hidden>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon
                      key={n}
                      className={
                        n <= review.rating ? 'size-3.5 text-brand-500' : 'size-3.5 text-ink-200'
                      }
                    />
                  ))}
                </div>
                {review.title && <p className="mt-2 text-sm font-bold text-ink-700">{review.title}</p>}
                {review.comment && (
                  <p className="mt-1 text-sm leading-7 text-ink-500">{review.comment}</p>
                )}
                {review.status === 'REJECTED' && review.adminNote && (
                  <p className="mt-2 text-xs text-red-600">دلیل رد: {review.adminNote}</p>
                )}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-pill px-3 py-1 text-xs font-bold ${REVIEW_STATUS_TONES[review.status]}`}
            >
              {REVIEW_STATUS_LABELS[review.status]}
            </span>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            ثبت‌شده در <span className="ltr-num">{new Date(review.createdAt).toLocaleDateString('fa-IR')}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
