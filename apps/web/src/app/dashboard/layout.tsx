'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

const TABS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/dashboard', label: 'نمای کلی', exact: true },
  { href: '/dashboard/orders', label: 'سفارش‌ها' },
  { href: '/dashboard/manufacturing-requests', label: 'درخواست‌های تولید' },
  { href: '/dashboard/requests', label: 'درخواست‌های تصویری' },
  { href: '/dashboard/favorites', label: 'علاقه‌مندی‌ها' },
  { href: '/dashboard/addresses', label: 'آدرس‌ها' },
  { href: '/dashboard/profile', label: 'پروفایل' },
];

/**
 * PRD §31 — shared shell for the whole `/dashboard/*` area (Overview, Orders,
 * Manufacturing Requests, Image Requests, Favorites, Addresses, Profile).
 *
 * These routes were already linked from elsewhere in the app before this
 * phase — `header.tsx` → `/dashboard` and `/dashboard/favorites`,
 * `product-request/page.tsx` → `/dashboard/requests` — and 404'd. Phase 6
 * fills them in.
 *
 * "نظرات من" (Reviews) is deliberately not a real tab: there is no Review
 * backend yet (gap documented since phase 3 — PRD §36/§50). It appears below
 * as a disabled "به‌زودی" (soon) row instead of a link to nowhere, per the
 * phase 6 decision in `claude/وضعیت-پیاده‌سازی.md`.
 *
 * "خودروی من" (My Vehicle, PRD §26) is P1 and gets only a small CTA on the
 * Overview tab, not a tab of its own — same call as phase 4.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [pathname, router]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  if (!ready) {
    return (
      <>
        <Header />
        <main className="container-page pb-16 pt-8">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="h-8 w-48 animate-pulse rounded-full bg-surface" />
            <div className="h-72 animate-pulse rounded-card bg-surface" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <h1 className="text-xl font-black text-ink-800 md:text-2xl">پنل کاربری</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <nav className="flex gap-2 overflow-x-auto rounded-card bg-surface p-2 lg:flex-col lg:items-stretch lg:overflow-visible">
              {TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'shrink-0 rounded-pill px-4 py-2.5 text-center text-sm font-bold transition-colors lg:text-start',
                    isActive(tab.href, tab.exact)
                      ? 'bg-brand-500 text-ink-900'
                      : 'text-ink-600 hover:bg-white',
                  )}
                >
                  {tab.label}
                </Link>
              ))}
              <span
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-pill px-4 py-2.5 text-sm text-ink-400 lg:justify-start"
                title="این بخش هنوز آماده نشده است."
              >
                نظرات من
                <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-[10px] text-ink-500">
                  به‌زودی
                </span>
              </span>
            </nav>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </main>

      <Footer />
    </>
  );
}
