'use client';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/dashboard', label: 'نمای کلی', exact: true },
  { href: '/dashboard/orders', label: 'سفارش‌ها' },
  { href: '/dashboard/manufacturing-requests', label: 'درخواست‌های تولید' },
  { href: '/dashboard/requests', label: 'درخواست‌های تصویری' },
  { href: '/dashboard/favorites', label: 'علاقه‌مندی‌ها' },
  { href: '/dashboard/my-vehicles', label: 'خودروهای من' },
  { href: '/dashboard/reviews', label: 'نظرات من' },
  { href: '/dashboard/addresses', label: 'آدرس‌ها' },
  { href: '/dashboard/profile', label: 'پروفایل' },
];

export function DashboardNavigation({
  pathname,
  onLogout,
  loggingOut = false,
}: {
  pathname: string;
  onLogout?: () => void;
  loggingOut?: boolean;
}) {
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav
      aria-label="منوی حساب کاربری"
      className="dashboard-navigation flex gap-2 overflow-x-auto rounded-card p-2 lg:flex-col lg:items-stretch lg:overflow-visible"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isActive(tab.href, tab.exact) ? 'page' : undefined}
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

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="shrink-0 rounded-pill px-4 py-2.5 text-center text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 lg:text-start"
        >
          {loggingOut ? 'در حال خروج...' : 'خروج از حساب'}
        </button>
      )}
    </nav>
  );
}
