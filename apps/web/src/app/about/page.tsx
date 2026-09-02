import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import {
  BoxIcon,
  CameraIcon,
  CarIcon,
  CartIcon,
  FactoryIcon,
  MicIcon,
  SearchIcon,
  ShieldCheckIcon,
} from '@/components/ui/icons';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'درباره ما',
  description:
    'عدالت فیلتر، مرجع تخصصی پیدا کردن، خرید و تولید فیلتر و قطعات مصرفی خودرو — فروشگاه، مرجع اطلاعات خودرو و تولید با برند اختصاصی در یک پلتفرم.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'درباره عدالت فیلتر',
    description: 'مرجع تخصصی پیدا کردن، خرید و تولید فیلتر و قطعات مصرفی خودرو.',
    url: `${SITE_URL}/about`,
  },
};

/** PRD §89 — سه رکن اصلی Positioning. */
const PILLARS = [
  {
    icon: SearchIcon,
    title: 'پیدا کن',
    body: 'حتی اگر نام یا کد دقیق قطعه را ندانید — با نام خودرو، کد فنی، عکس یا توضیح صوتی به قطعهٔ درست می‌رسید.',
  },
  {
    icon: CartIcon,
    title: 'بخر',
    body: 'خرید خرده برای مصرف شخصی یا خرید عمده با قیمت پلکانی برای فروشگاه‌ها، تعمیرگاه‌ها و پخش‌کنندگان.',
  },
  {
    icon: FactoryIcon,
    title: 'تولید کن',
    body: 'اگر کسب‌وکار دارید، همان محصول را با برند، بسته‌بندی و لوگوی اختصاصی خودتان تولید کنید.',
  },
];

/** PRD §2 — نمونه‌ای واقعی از سؤالاتی که پلتفرم باید پاسخ بدهد. */
const QUESTIONS = [
  'این خودرو چه فیلترهایی استفاده می‌کند؟',
  'فیلتر مناسب این خودرو چیست و کد فنی آن چیست؟',
  'چه خودروهای دیگری همین قطعه را استفاده می‌کنند؟',
  'این فیلتر چه زمانی باید تعویض شود؟',
  'نسخهٔ خرده و عمدهٔ این محصول چه قیمتی دارند؟',
  'آیا عدالت فیلتر این محصول را تولید می‌کند و می‌شود با برند من تولیدش کرد؟',
];

/** PRD §1/§89 — این چهار قابلیت باید در همان چند ثانیهٔ اول به کاربر منتقل شود. */
const CAPABILITIES = [
  {
    icon: CarIcon,
    title: 'مرجع اطلاعات خودرو',
    body: 'یک پایگاه دادهٔ مستقل از خودرو و قطعات سازگار آن — نه صرفاً فیلتر فروشگاه.',
  },
  {
    icon: BoxIcon,
    title: 'فروشگاه آنلاین',
    body: 'فروش خرده و عمدهٔ فیلتر و قطعات مصرفی خودرو، از برندهای معتبر داخلی و خارجی.',
  },
  {
    icon: FactoryIcon,
    title: 'تولید با برند اختصاصی',
    body: 'سفارش تولید محصول با برند، بسته‌بندی و لوگوی مشتری (Private Label).',
  },
  {
    icon: CameraIcon,
    title: 'کشف هوشمند قطعه',
    body: 'جست‌وجو با نام، کد فنی، خودرو، عکس یا صدا — حتی وقتی نام دقیق قطعه را نمی‌دانید.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero — PRD §89 positioning statement */}
        <section className="bg-ink-600 py-16 text-white md:py-20">
          <div className="container-page">
            <span className="inline-flex items-center gap-2 rounded-pill bg-brand-500/15 px-4 py-1.5 text-xs font-bold text-brand-500">
              دربارهٔ عدالت فیلتر
            </span>
            <h1 className="mt-5 max-w-2xl text-2xl font-black leading-relaxed md:text-4xl">
              مرجع تخصصی پیدا کردن، خرید و تولید فیلتر و قطعات مصرفی خودرو
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-white/75 md:text-base">
              «عدالت فیلتر» یک پلتفرم تخصصی حوزهٔ فیلتر، قطعات مصرفی و اطلاعات فنی خودرو است که
              فروشگاه آنلاین، سفارش تولید محصول با برند مشتری و مرجع اطلاعات خودرو و قطعات سازگار را
              در یک سیستم واحد ترکیب می‌کند — هدف این است که کاربر حتی اگر نام یا کد دقیق محصول
              موردنظر را نداند، از طریق اطلاعات خودرو، عکس یا توضیح صوتی به قطعهٔ درست برسد.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/products" size="lg">مشاهده محصولات</ButtonLink>
              <ButtonLink
                href="/manufacturing"
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                تولید با برند شما
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* سه رکن — FIND / BUY / MANUFACTURE */}
        <section className="container-page py-16">
          <h2 className="text-xl font-bold text-ink-800 md:text-2xl">سه رکن عدالت فیلتر</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-500">
            عدالت فیلتر فقط یک فروشگاه فیلتر نیست؛ مسیر کاربر را از «نمی‌دانم چه قطعه‌ای لازم دارم»
            تا «قطعهٔ مناسب را پیدا کردم و خریدم» و حتی «این محصول را با برند خودم تولید کردم»
            پوشش می‌دهد.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-card bg-surface p-7">
                <span className="grid size-14 place-items-center rounded-full bg-brand-500">
                  <Icon className="size-7 text-ink-900" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink-800">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink-500">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* چهار قابلیت اصلی */}
        <section className="bg-surface py-16">
          <div className="container-page">
            <h2 className="text-xl font-bold text-ink-800 md:text-2xl">در یک پلتفرم واحد</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-card bg-white p-6">
                  <Icon className="size-8 text-brand-600" />
                  <h3 className="mt-4 text-sm font-bold text-ink-800">{title}</h3>
                  <p className="mt-2 text-xs leading-6 text-ink-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* سؤالاتی که پاسخ می‌دهیم */}
        <section className="container-page py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <h2 className="text-xl font-bold text-ink-800 md:text-2xl">
                چه سؤال‌هایی را جواب می‌دهیم؟
              </h2>
              <p className="mt-4 text-sm leading-8 text-ink-500">
                هدف عدالت فیلتر این است که کاربر — چه متخصص باشد و چه اصلاً نام قطعه را نداند — به
                جواب برسد؛ با <MicIcon className="mx-1 inline size-4 align-[-2px] text-ink-400" />
                جست‌وجوی صوتی یا{' '}
                <CameraIcon className="mx-1 inline size-4 align-[-2px] text-ink-400" />
                ارسال تصویر قطعه هم می‌شود همین سؤال‌ها را دنبال کرد.
              </p>
              <ButtonLink href="/product-request" className="mt-7">
                محصولم را پیدا نکردم
              </ButtonLink>
            </div>

            <ul className="space-y-3">
              {QUESTIONS.map((q) => (
                <li
                  key={q}
                  className="flex items-start gap-3 rounded-card bg-surface px-5 py-4 text-sm leading-7 text-ink-700"
                >
                  <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-brand-600" />
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="container-page">
            <div className="flex flex-col items-center gap-5 rounded-card bg-brand-500/10 px-6 py-14 text-center">
              <h2 className="text-xl font-bold text-ink-800 md:text-2xl">
                خودرویتان را انتخاب کنید تا قطعهٔ مناسب را پیدا کنیم
              </h2>
              <p className="max-w-xl text-sm leading-7 text-ink-500">
                یا اگر کسب‌وکار دارید، درخواست تولید با برند اختصاصی خودتان را ثبت کنید.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/vehicles" size="lg">جست‌وجوی خودرو</ButtonLink>
                <Link
                  href="/contact"
                  className="inline-flex h-14 items-center rounded-pill px-6 text-sm font-bold text-ink-700 underline-offset-4 hover:underline"
                >
                  تماس با ما
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
