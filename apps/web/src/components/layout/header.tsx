'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { CartIcon, ChevronDownIcon, HeartIcon, UserIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'خانه' },
  { href: '/products', label: 'فروشگاه', hasMenu: true },
  { href: '/wholesale', label: 'فروش عمده' },
  { href: '/vehicles', label: 'خودرو ها' },
  { href: '/contact', label: 'تماس با ما' },
  { href: '/about', label: 'درباره ما' },
];

interface HeaderProps {
  /** The home page lays the header over the hero photo. */
  overlay?: boolean;
  cartCount?: number;
}

export function Header({ overlay = false, cartCount = 0 }: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header
      className={cn(
        'z-40 w-full',
        overlay ? 'absolute inset-x-0 top-0 text-white' : 'sticky top-0 border-b border-ink-100 bg-white text-ink-800',
      )}
    >
      <div className="container-page flex h-20 items-center justify-between gap-4 md:h-[136px]">
        {/* Primary navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1 text-base transition-colors',
                isActive(item.href) ? 'font-bold text-brand-500' : 'hover:text-brand-500',
              )}
            >
              {item.label}
              {item.hasMenu && <ChevronDownIcon className="size-4" />}
            </Link>
          ))}
        </nav>

        {/* Account actions — end side in RTL, so visually on the left. */}
        <div className="flex flex-row-reverse items-center gap-5 md:gap-7">
          <Link href="/cart" className="group flex flex-col items-center gap-1" aria-label="سبد خرید">
            <span className="relative">
              <CartIcon className="size-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -end-1.5 grid size-4 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-ink-900">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="hidden text-[11px] md:block">سبد خرید</span>
          </Link>

          <Link href="/dashboard/favorites" className="flex flex-col items-center gap-1">
            <HeartIcon className="size-6" />
            <span className="hidden text-[11px] md:block">علاقه مندی ها</span>
          </Link>

          <Link href="/dashboard" className="flex flex-col items-center gap-1">
            <UserIcon className="size-6" />
            <span className="hidden text-[11px] md:block">پروفایل</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="منو"
          aria-expanded={mobileOpen}
          className="grid size-11 place-items-center rounded-full border border-current/20 lg:hidden"
        >
          <span className="sr-only">منو</span>
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-ink-100 bg-white text-ink-800 lg:hidden">
          <ul className="container-page flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block border-b border-ink-50 py-3.5 text-base',
                    isActive(item.href) && 'font-bold text-brand-600',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
