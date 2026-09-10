'use client';

import { useState } from 'react';
import type { ProductReviewSummary, ProductReviewsResponse } from '@edalat/shared';
import { toPersianDigits } from '@edalat/shared';

import { Button } from '@/components/ui/button';
import { StarIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch, getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'size-3.5' : 'size-4';
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          className={cn(cls, n <= Math.round(value) ? 'text-brand-500' : 'text-ink-200')}
        />
      ))}
    </div>
  );
}

/** Interactive 1–5 star picker for the review form. */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="امتیاز شما">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} از ۵ ستاره`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <StarIcon className={cn('size-7', n <= value ? 'text-brand-500' : 'text-ink-200')} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ProductReviewSummary }) {
  return (
    <li className="rounded-card bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold text-ink-800">{review.userName}</span>
          {review.isVerifiedPurchase && (
            <span className="rounded-pill bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-800">
              خرید تأییدشده
            </span>
          )}
        </div>
        <span className="ltr-num text-xs text-ink-500">
          {new Date(review.createdAt).toLocaleDateString('fa-IR')}
        </span>
      </div>
      <div className="mt-2">
        <Stars value={review.rating} />
      </div>
      {review.title && <p className="mt-2 font-bold text-ink-800">{review.title}</p>}
      {review.comment && <p className="mt-1 text-sm leading-7 text-ink-600">{review.comment}</p>}
    </li>
  );
}

/**
 * PRD §36 — Product Detail "نظرات کاربران" tab. `initial` is fetched
 * server-side (page.tsx) so the tab isn't empty on first paint; the review
 * form below it is what feeds `POST /reviews` (فاز ۹د — this tab didn't
 * exist before since the reviews backend didn't either).
 */
export function ProductReviews({
  productId,
  initial,
}: {
  productId: string;
  initial: ProductReviewsResponse;
}) {
  const [reviews] = useState(initial.items);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!getSession()) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (rating < 1) {
      setSubmitError('لطفاً امتیاز را مشخص کنید.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await authFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      });
      setSubmitted(true);
      setRating(0);
      setTitle('');
      setComment('');
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      setSubmitError(err instanceof Error ? err.message : 'ثبت نظر ناموفق بود.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {reviews.length > 0 && (
        <div className="flex items-center gap-3 rounded-card bg-white p-5">
          <span className="text-2xl font-black text-ink-800">
            {toPersianDigits(initial.averageRating.toFixed(1))}
          </span>
          <div>
            <Stars value={initial.averageRating} />
            <p className="mt-1 text-xs text-ink-500">
              از {toPersianDigits(initial.pagination.total)} نظر ثبت‌شده
            </p>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="rounded-card bg-white px-6 py-10 text-center text-sm leading-7 text-ink-500">
          هنوز نظری برای این محصول ثبت نشده است. اولین نفری باشید که تجربه‌اش را می‌نویسد.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}

      <div className="rounded-card bg-white p-6">
        <h3 className="font-bold text-ink-800">ثبت نظر شما</h3>

        {submitted ? (
          <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            نظر شما ثبت شد و پس از تأیید تیم عدالت فیلتر نمایش داده خواهد شد.
          </p>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
            <div>
              <span className="mb-2 block text-sm text-ink-600">امتیاز شما</span>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان نظر (اختیاری)"
              maxLength={120}
              className="h-11 w-full rounded-lg border border-ink-200 px-4 text-sm outline-none focus:border-brand-500"
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="تجربه خود از این محصول را بنویسید (اختیاری)"
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-ink-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'در حال ارسال…' : 'ثبت نظر'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
