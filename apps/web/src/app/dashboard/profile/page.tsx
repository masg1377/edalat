'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@edalat/shared';

import { Button } from '@/components/ui/button';
import { AuthRequiredError, authFetch } from '@/lib/auth';

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  nationalId: string;
}

function toFormState(profile: UserProfile): ProfileFormState {
  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    email: profile.email ?? '',
    companyName: profile.companyName ?? '',
    nationalId: profile.nationalId ?? '',
  };
}

const field =
  'h-13 w-full rounded-pill border border-ink-200 bg-white px-5 py-3.5 text-sm text-ink-800 ' +
  'outline-none transition-colors focus:border-brand-500';

/**
 * PRD §31/§78 — Dashboard → Profile, on `GET/PATCH /users/me` (new in phase
 * 6 — see `claude/وضعیت-پیاده‌سازی.md`, "شناسایی فاز ۶"). Phone is shown but
 * not editable here: it's the account's primary credential (PRD §30) and
 * changing it is an identity operation, not a profile edit — out of scope.
 */
export default function DashboardProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const redirectToLogin = useCallback(() => {
    router.replace('/login?next=%2Fdashboard%2Fprofile');
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch<UserProfile>('/users/me');
      setProfile(data);
      setForm(toFormState(data));
      setLoadError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'بارگذاری پروفایل ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!form) return;
    setPending(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await authFetch<UserProfile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          email: form.email || undefined,
          companyName: form.companyName || undefined,
          nationalId: form.nationalId || undefined,
        }),
      });
      setProfile(updated);
      setForm(toFormState(updated));
      setSaved(true);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setSaveError(err instanceof Error ? err.message : 'ذخیره پروفایل ناموفق بود.');
    } finally {
      setPending(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="space-y-3">
        <div className="h-96 animate-pulse rounded-card bg-surface" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-card bg-surface px-6 py-14 text-center">
        <p className="text-sm leading-8 text-ink-500">{loadError}</p>
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

  return (
    <form
      className="rounded-card bg-surface p-6 md:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h2 className="font-bold text-ink-800">اطلاعات حساب کاربری</h2>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs text-ink-600">شماره موبایل</span>
          <input
            value={profile?.phone ?? ''}
            disabled
            className={`${field} ltr-num text-start opacity-60`}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs text-ink-600">نام</span>
          <input
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs text-ink-600">نام خانوادگی</span>
          <input
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs text-ink-600">ایمیل</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={`${field} ltr-num text-start`}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs text-ink-600">نام شرکت (برای مشتریان عمده)</span>
          <input
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs text-ink-600">کد ملی / شناسه ثبت شرکت</span>
          <input
            value={form.nationalId}
            onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
            className={`${field} ltr-num text-start`}
          />
        </label>
      </div>

      {saveError && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </p>
      )}
      {saved && !saveError && (
        <p className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          تغییرات با موفقیت ذخیره شد.
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-6">
        {pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
      </Button>
    </form>
  );
}
