import type { CategorySummary } from '@edalat/shared';
import { ManufacturingStatus } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import {
  BoxIcon,
  ClockIcon,
  FactoryIcon,
  HeadsetIcon,
  PercentIcon,
  ShieldCheckIcon,
  TruckIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { api, safe } from '@/lib/api';
import { MANUFACTURING_STATUS_LABELS } from '@/lib/status-labels';

/** PRD §27 — the standalone intro page: turn a B2B visitor into a production
 * lead (§27's own goal statement). Content is grouped exactly by the PRD's
 * bullet list: factory intro, capacity, product types, process, private
 * label, packaging, MOQ, quality/standards, CTA. */
export const revalidate = 300;

const CAPACITY = [
  { icon: FactoryIcon, value: '+۲۵ سال', label: 'سابقه تأمین و تولید قطعات فیلتر' },
  { icon: BoxIcon, value: '+۵٬۰۰۰', label: 'قلم محصول در پرتفوی فعلی' },
  { icon: UsersIcon, value: '+۱۰٬۰۰۰', label: 'مشتری عمده و خرده' },
  { icon: TruckIcon, value: '۲۴-۴۸ ساعت', label: 'آماده‌سازی و ارسال سفارش' },
];

/** A representative slice of the real §29 status machine, not a separate
 * marketing-only list — so this page never drifts from what customers
 * actually see on `/dashboard/manufacturing-requests`. */
const PROCESS_STEPS: ManufacturingStatus[] = [
  ManufacturingStatus.REVIEWING,
  ManufacturingStatus.FEASIBILITY_APPROVED,
  ManufacturingStatus.QUOTATION_SENT,
  ManufacturingStatus.APPROVED,
  ManufacturingStatus.PRODUCTION,
  ManufacturingStatus.QUALITY_CONTROL,
  ManufacturingStatus.PACKAGING,
  ManufacturingStatus.READY,
];

export default async function ManufacturingIntroPage() {
  // Product types this page can promise to manufacture come straight from
  // the live Category tree (PRD Rule 7 — admin content, not hardcoded copy).
  const categories = await safe(api.categories.list(), [] as CategorySummary[]);

  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="bg-ink-600 py-16 text-white md:py-20">
          <div className="container-page">
            <span className="inline-flex items-center gap-2 rounded-pill bg-brand-500/15 px-4 py-1.5 text-xs font-bold text-brand-500">
              تولید و برندسازی اختصاصی
            </span>
            <h1 className="mt-5 max-w-2xl text-2xl font-black md:text-4xl">
              فیلتر و قطعات مصرفی خودرو را با برند خودتان تولید کنید
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-white/75 md:text-base">
              عدالت فیلتر علاوه بر فروش، امکان تولید محصول با برند اختصاصی مشتری (Private Label) را
              دارد — از طراحی بسته‌بندی تا تولید در تیراژ صنعتی، همه در یک مسیر مشخص و قابل پیگیری.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/manufacturing/request" size="lg">
                ثبت درخواست تولید
              </ButtonLink>
              <ButtonLink href="/dashboard/manufacturing-requests" size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                پیگیری درخواست‌های من
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* توان تولید */}
        <section className="border-b border-ink-100 bg-surface py-10">
          <ul className="container-page grid grid-cols-2 gap-8 md:grid-cols-4">
            {CAPACITY.map(({ icon: Icon, value, label }) => (
              <li key={label} className="flex items-center justify-center gap-3 text-center md:justify-start md:text-start">
                <Icon className="size-8 shrink-0 text-brand-600" />
                <span>
                  <b className="ltr-num block text-sm font-bold text-ink-800">{value}</b>
                  <span className="mt-1 block text-xs text-ink-500">{label}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* معرفی کارخانه */}
        <section className="container-page py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <h2 className="text-xl font-bold text-ink-800 md:text-2xl">معرفی کارخانه</h2>
              <p className="mt-4 text-sm leading-8 text-ink-500">
                خط تولید عدالت فیلتر برای انواع فیلتر خودرویی (روغن، هوا، کابین، سوخت) و قطعات مصرفی
                مشابه طراحی شده و توانایی تولید هم برای فروشگاه‌های ما و هم برای سفارش‌های Private
                Label مشتریان تجاری را دارد. هر سفارش تولید پیش از ورود به خط، از نظر امکان‌سنجی فنی
                توسط کارشناسان بررسی می‌شود.
              </p>
            </div>
            <div
              aria-hidden
              className="hidden h-64 rounded-card bg-surface lg:block"
              style={{ backgroundImage: 'var(--manufacturing-factory-image, none)', backgroundSize: 'cover' }}
            />
          </div>
        </section>

        {/* انواع محصولات قابل تولید */}
        <section className="bg-surface py-16">
          <div className="container-page">
            <h2 className="text-xl font-bold text-ink-800 md:text-2xl">انواع محصولات قابل تولید</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-500">
              فهرست زیر مطابق دسته‌بندی فعلی محصولات فروشگاه است؛ اگر محصول موردنظر شما در این لیست
              نیست هم در فرم درخواست قابل ذکر است — کارشناسان امکان‌سنجی آن را بررسی می‌کنند.
            </p>

            {categories.length > 0 ? (
              <ul className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className="rounded-card bg-white px-5 py-4 text-center text-sm font-bold text-ink-700"
                  >
                    {category.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-7 rounded-card bg-white px-5 py-6 text-center text-sm text-ink-500">
                فهرست دسته‌بندی محصولات موقتاً در دسترس نیست — نوع محصول موردنظرتان را در فرم درخواست
                بنویسید.
              </p>
            )}
          </div>
        </section>

        {/* فرایند تولید */}
        <section className="container-page py-16">
          <h2 className="text-xl font-bold text-ink-800 md:text-2xl">فرایند تولید</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-500">
            همان مراحلی که پس از ثبت درخواست در پنل کاربری خود می‌بینید:
          </p>

          <ol className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2">
            {PROCESS_STEPS.map((status, index) => (
              <li
                key={status}
                className="flex min-w-[9.5rem] shrink-0 snap-start flex-col gap-3 rounded-card bg-surface p-5"
              >
                <span className="grid size-9 place-items-center rounded-full bg-brand-500 text-sm font-bold text-ink-900">
                  <span className="ltr-num">{index + 1}</span>
                </span>
                <span className="text-sm font-bold text-ink-800">{MANUFACTURING_STATUS_LABELS[status]}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Private Label + Packaging */}
        <section className="bg-ink-600 py-16 text-white">
          <div className="container-page grid gap-10 md:grid-cols-2">
            <div>
              <span className="grid size-12 place-items-center rounded-card bg-ink-500">
                <PercentIcon className="size-6 text-brand-500" />
              </span>
              <h2 className="mt-5 text-lg font-bold text-brand-500">Private Label — تولید با برند شما</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">
                لوگو، نام تجاری و مشخصات برند شما روی محصول و بسته‌بندی درج می‌شود. کافی‌ست در فرم
                درخواست، لوگو و نام برندتان را بارگذاری کنید.
              </p>
            </div>
            <div>
              <span className="grid size-12 place-items-center rounded-card bg-ink-500">
                <BoxIcon className="size-6 text-brand-500" />
              </span>
              <h2 className="mt-5 text-lg font-bold text-brand-500">طراحی و تولید بسته‌بندی</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">
                در صورت داشتن طرح بسته‌بندی آماده، فایل طرح قابل بارگذاری است؛ در غیر این‌صورت تیم ما
                بر اساس نوع محصول و برند شما پیشنهاد طراحی ارائه می‌دهد.
              </p>
            </div>
          </div>
        </section>

        {/* MOQ + Quality */}
        <section className="container-page py-16">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-card bg-surface p-7">
              <ClockIcon className="size-8 text-brand-600" />
              <h2 className="mt-4 text-lg font-bold text-ink-800">حداقل تعداد سفارش (MOQ)</h2>
              <p className="mt-3 text-sm leading-7 text-ink-500">
                حداقل تیراژ تولید بسته به نوع محصول، پیچیدگی قالب و بسته‌بندی متفاوت است. تعداد
                دقیق پس از بررسی درخواست شما توسط کارشناسان در قالب استعلام قیمت اعلام می‌شود.
              </p>
            </div>
            <div className="rounded-card bg-surface p-7">
              <ShieldCheckIcon className="size-8 text-brand-600" />
              <h2 className="mt-4 text-lg font-bold text-ink-800">کیفیت و استانداردها</h2>
              <p className="mt-3 text-sm leading-7 text-ink-500">
                محصولات تولیدی پیش از بسته‌بندی مرحلهٔ کنترل کیفیت را می‌گذرانند و بر اساس استانداردهای
                فنی همان دستهٔ محصول (روغن، هوا، کابین، سوخت) تولید می‌شوند.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="container-page">
            <div className="flex flex-col items-center gap-5 rounded-card bg-brand-500/10 px-6 py-14 text-center">
              <HeadsetIcon className="size-10 text-brand-600" />
              <h2 className="text-xl font-bold text-ink-800 md:text-2xl">
                آماده‌اید محصول‌تان را با برند خودتان تولید کنید؟
              </h2>
              <p className="max-w-xl text-sm leading-7 text-ink-500">
                فرم درخواست تولید را در چند مرحلهٔ ساده تکمیل کنید؛ کارشناسان ما در اسرع وقت با شما
                تماس می‌گیرند.
              </p>
              <ButtonLink href="/manufacturing/request" size="lg">
                ثبت درخواست تولید
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
