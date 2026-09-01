'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ProductIdentificationRequestSummary } from '@edalat/shared';

import { ButtonLink } from '@/components/ui/button';
import { CameraIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch } from '@/lib/auth';
import { IDENTIFICATION_STATUS_LABELS, IDENTIFICATION_STATUS_TONES } from '@/lib/status-labels';
import { productImage } from '@/lib/media';

/**
 * PRD §12/§31 — Dashboard → Image Requests. This is the page
 * `/product-request` already links to ("پیگیری در پنل کاربری") after a
 * submission — it 404'd until this phase.
 */
export default function DashboardImageRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ProductIdentificationRequestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch<ProductIdentificationRequestSummary[]>('/product-requests');
      setRequests(data);
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/login?next=%2Fdashboard%2Frequests');
        return;
      }
      setError(err instanceof Error ? err.message : 'بارگذاری درخواست‌ها ناموفق بود.');
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

  if (!requests || requests.length === 0) {
    return (
      <div className="rounded-card bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white">
          <CameraIcon className="size-8 text-ink-400" aria-hidden />
        </span>
        <h2 className="mt-6 text-lg font-bold text-ink-800">هنوز تصویری ارسال نکرده‌اید</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
          قطعه‌ای که نامش را نمی‌دانید؟ عکسش را برای ما بفرستید تا شناسایی‌اش کنیم.
        </p>
        <ButtonLink href="/product-request" size="lg" className="mt-8">
          ارسال تصویر محصول
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => {
        const image = productImage(request.images[0] ?? null);
        return (
          <li key={request.id} className="rounded-card bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white">
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes="64px"
                    unoptimized={image.src.startsWith('data:')}
                    className={image.isPlaceholder ? 'object-contain p-3 opacity-60' : 'object-cover'}
                  />
                </div>
                <div>
                  <p className="font-bold text-ink-800">
                    {request.possibleCode ?? request.vehicleLabel ?? 'درخواست شناسایی قطعه'}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    کد پیگیری: <span className="ltr-num">{request.referenceNumber}</span> ·{' '}
                    <span className="ltr-num">{new Date(request.createdAt).toLocaleDateString('fa-IR')}</span>
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-pill px-3 py-1 text-xs font-bold ${IDENTIFICATION_STATUS_TONES[request.status]}`}
              >
                {IDENTIFICATION_STATUS_LABELS[request.status]}
              </span>
            </div>

            {request.adminResponse && (
              <p className="mt-4 rounded-xl bg-white p-4 text-xs leading-7 text-ink-600">
                <b className="text-ink-800">پاسخ کارشناس: </b>
                {request.adminResponse}
              </p>
            )}

            {request.identifiedProduct && (
              <Link
                href={`/products/${request.identifiedProduct.slug}`}
                className="mt-4 flex items-center gap-3 rounded-xl bg-white p-3 transition-colors hover:bg-ink-100"
              >
                <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-surface">
                  <Image
                    src={productImage(request.identifiedProduct.mainImageUrl).src}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-contain p-1.5"
                  />
                </div>
                <span className="text-sm font-bold text-ink-800">
                  محصول شناسایی‌شده: {request.identifiedProduct.name}
                </span>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
