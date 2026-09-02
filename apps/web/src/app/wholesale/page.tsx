import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import {
  BoxIcon,
  ClockIcon,
  FileIcon,
  HeadsetIcon,
  PercentIcon,
  SearchIcon,
  ShieldCheckIcon,
  TruckIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'فروش عمده',
  description:
    'خرید عمدهٔ فیلتر و قطعات مصرفی خودرو برای فروشگاه‌ها، تعویض‌روغنی‌ها، تعمیرگاه‌ها و پخش‌کنندگان — قیمت پلکانی بر اساس تعداد.',
  alternates: { canonical: `${SITE_URL}/wholesale` },
  openGraph: {
    title: 'فروش عمده — عدالت فیلتر',
    description: 'قیمت پلکانی بر اساس تعداد برای مشتریان تجاری.',
    url: `${SITE_URL}/wholesale`,
  },
};

/** PRD §4.2 — نیازهای اصلی مشتری عمده. */
const AUDIENCE = [
  'فروشگاه قطعات یدکی',
  'تعویض روغنی',
  'تعمیرگاه',
  'پخش‌کننده',
  'فروشندگان قطعات',
];

const NEEDS = [
  { icon: PercentIcon, title: 'قیمت عمده', body: 'مستقل از قیمت خرده و بر اساس تعداد سفارش.' },
  { icon: SearchIcon, title: 'جست‌وجو با کد فنی', body: 'پیدا کردن سریع قطعه با کد فنی یا OEM.' },
  { icon: TruckIcon, title: 'ثبت سفارش سریع', body: 'افزودن به سبد با حالت «عمده» در همان صفحهٔ محصول.' },
  { icon: BoxIcon, title: 'مشاهدهٔ موجودی', body: 'موجودی واقعی هر محصول پیش از ثبت سفارش.' },
  { icon: FileIcon, title: 'فاکتور', body: 'فاکتور رسمی برای هر سفارش عمده.' },
  { icon: ClockIcon, title: 'سفارش مجدد', body: 'دسترسی به سفارش‌های قبلی برای ثبت سریع‌تر سفارش بعدی.' },
];

/**
 * PRD §3.2/§18 — نمونهٔ مفهومی پلکان قیمت، بدون هیچ عدد هاردکد.
 *
 * مقادیر واقعی هر محصول (`WholesalePriceRule`) در دیتابیس و صفحهٔ همان محصول
 * است (همان جدول «پلکان قیمت عمده» که `purchase-box.tsx` نمایش می‌دهد)؛ اینجا
 * فقط ساختار پلکان (چند سطح، تعداد بیشتر → قیمت واحد کمتر) توضیح داده می‌شود.
 */
const TIER_SHAPE = [
  { level: 'قیمت خرده', range: 'تعداد کم (مثلاً ۱ تا ۵ عدد)' },
  { level: 'عمده — سطح ۱', range: 'تعداد متوسط' },
  { level: 'عمده — سطح ۲', range: 'تعداد بیشتر' },
  { level: 'عمده — ویژه', range: 'تعداد بالا' },
];

export default function WholesalePage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="bg-ink-600 py-16 text-white md:py-20">
          <div className="container-page">
            <span className="inline-flex items-center gap-2 rounded-pill bg-brand-500/15 px-4 py-1.5 text-xs font-bold text-brand-500">
              فروش عمده
            </span>
            <h1 className="mt-5 max-w-2xl text-2xl font-black md:text-4xl">
              فیلتر و قطعات مصرفی خودرو را با قیمت عمده تهیه کنید
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-white/75 md:text-base">
              فروشگاه‌ها، پخش‌کنندگان و مشتریان تجاری می‌توانند محصولات را با حالت «خرید عمده» سفارش
              دهند. قیمت عمده مستقل از قیمت خرده است و می‌تواند بر اساس تعداد سفارش تغییر کند —
              همیشه از سرور محاسبه و اعتبارسنجی می‌شود، نه از مرورگر.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/products?purchaseType=WHOLESALE" size="lg">
                مشاهده محصولات با قیمت عمده
              </ButtonLink>
              <ButtonLink
                href="/contact"
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                مشاوره فروش عمده
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* مخاطب */}
        <section className="border-b border-ink-100 bg-surface py-10">
          <div className="container-page">
            <p className="mb-5 text-sm font-bold text-ink-700">فروش عمده مناسب این کسب‌وکارهاست:</p>
            <ul className="flex flex-wrap gap-3">
              {AUDIENCE.map((item) => (
                <li key={item} className="flex items-center gap-2 rounded-pill bg-white px-5 py-2.5 text-sm text-ink-700">
                  <UsersIcon className="size-4 text-brand-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* چطور قیمت پلکانی کار می‌کند */}
        <section className="container-page py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <h2 className="text-xl font-bold text-ink-800 md:text-2xl">قیمت پلکانی چطور کار می‌کند؟</h2>
              <p className="mt-4 text-sm leading-8 text-ink-500">
                قیمت عمده هر محصول ثابت نیست؛ هرچه تعداد سفارش بیشتر باشد، قیمت واحد پایین‌تر می‌آید.
                تعداد سطح‌ها، حداقل سفارش و قیمت هر سطح برای هر محصول جداگانه در پنل مدیریت تعریف
                می‌شود — ساختار نمونهٔ آن به این شکل است:
              </p>

              <div className="mt-7 rounded-card bg-surface p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-ink-400">
                      <th scope="col" className="pb-3 text-start font-normal">سطح قیمت</th>
                      <th scope="col" className="pb-3 text-start font-normal">بازهٔ تعداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIER_SHAPE.map((tier, index) => (
                      <tr key={tier.level} className={cn('border-t border-ink-100', index === 0 && 'text-ink-500')}>
                        <td className="py-3 font-bold text-ink-800">{tier.level}</td>
                        <td className="py-3">{tier.range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-xs leading-6 text-ink-400">
                  این فقط نمونهٔ ساختار پلکان است — تعداد سطح‌ها، حداقل سفارش و قیمت دقیق هر سطح در
                  صفحهٔ همان محصول (بخش «خرید عمده») نمایش داده می‌شود.
                </p>
              </div>

              <p className="mt-5 text-xs leading-6 text-ink-400">
                قیمت نهایی همیشه سمت سرور و بر اساس تعداد واقعی سفارش محاسبه می‌شود؛ مرورگر هرگز
                منبع قیمت نیست.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-ink-800 md:text-2xl">امکانات خرید عمده</h2>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {NEEDS.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="rounded-card bg-white p-5 shadow-card">
                    <Icon className="size-7 text-brand-600" />
                    <h3 className="mt-3 text-sm font-bold text-ink-800">{title}</h3>
                    <p className="mt-2 text-xs leading-6 text-ink-500">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* روش خرید */}
        <section className="bg-ink-600 py-16 text-white">
          <div className="container-page">
            <h2 className="text-lg font-bold text-brand-500 md:text-xl">ثبت سفارش عمده چطور است؟</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              <li>
                <span className="grid size-9 place-items-center rounded-full bg-brand-500 text-sm font-bold text-ink-900">۱</span>
                <p className="mt-4 text-sm leading-7 text-white/80">وارد صفحهٔ محصول موردنظر شوید و «خرده / عمده» را به «عمده» تغییر دهید.</p>
              </li>
              <li>
                <span className="grid size-9 place-items-center rounded-full bg-brand-500 text-sm font-bold text-ink-900">۲</span>
                <p className="mt-4 text-sm leading-7 text-white/80">تعداد موردنیاز را وارد کنید — قیمت واحد بر اساس پلکان همان محصول به‌روزرسانی می‌شود.</p>
              </li>
              <li>
                <span className="grid size-9 place-items-center rounded-full bg-brand-500 text-sm font-bold text-ink-900">۳</span>
                <p className="mt-4 text-sm leading-7 text-white/80">به سبد خرید اضافه و روند تسویه‌حساب را طی کنید؛ سبد می‌تواند اقلام خرده و عمده را همزمان داشته باشد.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="container-page">
            <div className="flex flex-col items-center gap-5 rounded-card bg-brand-500/10 px-6 py-14 text-center">
              <HeadsetIcon className="size-10 text-brand-600" />
              <h2 className="text-xl font-bold text-ink-800 md:text-2xl">
                سؤالی دربارهٔ خرید عمده دارید؟
              </h2>
              <p className="max-w-xl text-sm leading-7 text-ink-500">
                کارشناسان فروش عمده آمادهٔ مشاوره دربارهٔ تعداد، قیمت پلکانی و زمان تحویل هستند.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/contact" size="lg">تماس با کارشناس فروش</ButtonLink>
                <Link
                  href="/products?purchaseType=WHOLESALE"
                  className="inline-flex h-14 items-center rounded-pill px-6 text-sm font-bold text-ink-700 underline-offset-4 hover:underline"
                >
                  <ShieldCheckIcon className="me-2 size-4" />
                  مشاهده محصولات
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
