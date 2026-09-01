'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ManufacturingRequestSummary } from '@edalat/shared';
import { toPersianDigits, formatToman } from '@edalat/shared';

import { ButtonLink } from '@/components/ui/button';
import { BoxIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch } from '@/lib/auth';
import { MANUFACTURING_STATUS_LABELS, MANUFACTURING_STATUS_TONES } from '@/lib/status-labels';

/** PRD §29/§31 — Dashboard → Manufacturing Requests. Read-only status
 * tracking; creating a request happens on `/manufacturing` (phase 7). */
export default function DashboardManufacturingRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ManufacturingRequestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch<ManufacturingRequestSummary[]>('/manufacturing/requests');
      setRequests(data);
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.replace('/login?next=%2Fdashboard%2Fmanufacturing-requests');
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
        <div className="h-24 animate-pulse rounded-card bg-surface" />
        <div className="h-24 animate-pulse rounded-card bg-surface" />
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
          <BoxIcon className="size-8 text-ink-400" aria-hidden />
        </span>
        <h2 className="mt-6 text-lg font-bold text-ink-800">هنوز درخواست تولیدی ثبت نکرده‌اید</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
          می‌خواهید محصولی را با برند اختصاصی خودتان تولید کنید؟
        </p>
        <ButtonLink href="/manufacturing" size="lg" className="mt-8">
          ثبت درخواست تولید
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li key={request.id} className="rounded-card bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold text-ink-800">
                {request.brandName} — {request.productType}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                کد پیگیری: <span className="ltr-num">{request.referenceNumber}</span> ·{' '}
                <span className="ltr-num">{new Date(request.createdAt).toLocaleDateString('fa-IR')}</span>
              </p>
            </div>
            <span
              className={`rounded-pill px-3 py-1 text-xs font-bold ${MANUFACTURING_STATUS_TONES[request.status]}`}
            >
              {MANUFACTURING_STATUS_LABELS[request.status]}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-500">
            <span>
              تعداد: <span className="ltr-num font-bold text-ink-700">{toPersianDigits(request.quantity)}</span>
            </span>
            {request.quotedUnitPrice !== null && (
              <span>
                قیمت پیشنهادی هر واحد:{' '}
                <span className="ltr-num font-bold text-ink-700">{formatToman(request.quotedUnitPrice)}</span> تومان
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
