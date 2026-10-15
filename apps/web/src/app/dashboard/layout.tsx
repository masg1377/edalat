'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { getSession, logout } from '@/lib/auth';
import { DashboardNavigation } from '@/components/layout/dashboard-navigation';

/**
 * PRD §31 — shared shell for the whole `/dashboard/*` area (Overview, Orders,
 * Manufacturing Requests, Image Requests, Favorites, Addresses, Profile).
 *
 * These routes were already linked from elsewhere in the app before this
 * phase — `header.tsx` → `/dashboard` and `/dashboard/favorites`,
 * `product-request/page.tsx` → `/dashboard/requests` — and 404'd. Phase 6
 * fills them in.
 *
 * "نظرات من" (Reviews) was a disabled "به‌زودی" row since phase 6 because
 * the reviews backend didn't exist (PRD §36/§50) — فاز ۹د adds the real
 * `GET /reviews/mine` endpoint and `/dashboard/reviews`, so it's a normal
 * tab now like the others above.
 *
 * "خودروهای من" (My Vehicle, PRD §26) has its own tab + CRUD as of this
 * phase — Overview still shows a small preview, this tab is the full list.
 *
 * فاز اصلاحی — باگ ۱: تا این فاز هیچ دکمهٔ «خروج از حساب» در فروشگاه وجود
 * نداشت (فقط `authFetch` هنگام نامعتبر شدن refresh token به‌صورت خودکار
 * session را پاک می‌کرد — نه یک اقدام آگاهانهٔ کاربر). این تب‌بار همان جایی
 * است که کاربر بعد از لاگین همیشه می‌بیند، پس دکمهٔ خروج زیر لیست تب‌ها
 * اضافه شد؛ الگو دقیقاً همان `logout()` در apps/admin/src/lib/auth.ts است.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace('/');
    }
  };

  useEffect(() => {
    if (!getSession()) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <>
        <Header />
        <main className="dashboard-page container-page pb-16 pt-8">
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

      <main className="dashboard-page container-page pb-16 pt-8">
        <h1 className="text-xl font-black text-ink-800 md:text-2xl">پنل کاربری</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <DashboardNavigation
              pathname={pathname}
              onLogout={() => void handleLogout()}
              loggingOut={loggingOut}
            />
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </main>

      <Footer />
    </>
  );
}
