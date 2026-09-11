import type { Metadata } from 'next';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import { SearchIcon } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'صفحه پیدا نشد' };

/**
 * PRD §88 — "هیچ Search ناموفقی نباید Dead End باشد" applies just as much
 * to a broken/typo'd URL: this is Next's App Router convention (rendered
 * for every explicit `notFound()` call and any unmatched route), so instead
 * of the framework's blank default we give the user the same three ways
 * forward the rest of the site's empty states use.
 */
export default function NotFound() {
  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <div className="mx-auto max-w-lg rounded-card bg-surface px-6 py-16 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-500">
            <SearchIcon className="size-8 text-ink-900" aria-hidden />
          </span>
          <h1 className="mt-6 text-lg font-bold text-ink-800">این صفحه پیدا نشد</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
            ممکن است آدرس اشتباه باشد یا صفحه جابه‌جا شده باشد. می‌توانید از راه‌های زیر ادامه دهید،
            یا اگر دنبال قطعه‌ای خاص می‌گردید، تصویرش را برای ما بفرستید تا پیدایش کنیم.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/" size="lg">بازگشت به خانه</ButtonLink>
            <ButtonLink href="/products" size="lg" variant="outline">جست‌وجوی محصول</ButtonLink>
            <ButtonLink href="/product-request" size="lg" variant="outline">ارسال تصویر محصول</ButtonLink>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
