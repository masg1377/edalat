'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface MobileFiltersProps {
  children: ReactNode;
  /** Number of filters currently applied, shown on the trigger. */
  activeCount: number;
  activeCountLabel: string;
}

/**
 * On small screens the filter panel lives in a bottom sheet.
 *
 * It reuses the same panel markup as desktop rather than a cut-down variant,
 * so a filter can never exist on one breakpoint and be missing on the other.
 * Since every filter navigates, the sheet closes itself when the URL changes.
 */
export function MobileFilters({ children, activeCount, activeCountLabel }: MobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // A filter link navigated: the result is behind the sheet, so close it.
  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    // Focus moves into the sheet so keyboard users are not left behind it.
    panelRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) triggerRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-12 items-center gap-2 rounded-pill bg-sand px-5 text-sm font-bold text-ink-800 lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
        فیلترها
        {activeCount > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-brand-500 text-[11px] text-ink-900">
            {activeCountLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="فیلتر محصولات"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-card bg-white outline-none"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-4">
              <h2 className="font-bold text-ink-800">فیلترها</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن فیلترها"
                className="grid size-9 place-items-center rounded-full bg-ink-50 text-ink-700"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="px-5 pb-8">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
