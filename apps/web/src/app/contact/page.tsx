import type { Metadata } from 'next';
import Link from 'next/link';

import { ContactMailtoForm } from '@/components/contact/contact-mailto-form';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ButtonLink } from '@/components/ui/button';
import { CameraIcon, ClockIcon, FactoryIcon, MailIcon, MapPinIcon, PhoneIcon } from '@/components/ui/icons';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'تماس با ما',
  description: 'راه‌های تماس با عدالت فیلتر — تلفن، ایمیل و آدرس، یا ارسال مستقیم پیام.',
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: 'تماس با عدالت فیلتر',
    description: 'راه‌های تماس با تیم فروش و پشتیبانی عدالت فیلتر.',
    url: `${SITE_URL}/contact`,
  },
};

const CONTACT_CARDS = [
  { icon: PhoneIcon, label: 'تلفن تماس', value: '۰۹۱۱۱۲۳۴۵۶۷', href: 'tel:09111234567' },
  { icon: MailIcon, label: 'ایمیل', value: 'example@gmail.com', href: 'mailto:example@gmail.com' },
  { icon: MapPinIcon, label: 'آدرس', value: 'مازندران، ساری', href: undefined },
];

/**
 * برای سؤال‌های اختصاصی (پیگیری سفارش، تولید، محصول ناشناخته)، بهتر است کاربر
 * به همان مسیر واقعی و ثبت‌شده در Backend هدایت شود، نه فرم عمومی تماس.
 */
const SHORTCUTS = [
  {
    icon: CameraIcon,
    title: 'محصولم را پیدا نکردم',
    body: 'عکس یا توضیح قطعه را بفرستید تا شناسایی‌اش کنیم.',
    href: '/product-request',
  },
  {
    icon: FactoryIcon,
    title: 'تولید با برند من',
    body: 'ثبت درخواست تولید Private Label با پیگیری وضعیت.',
    href: '/manufacturing/request',
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <nav aria-label="مسیر صفحه" className="mb-6 text-sm text-ink-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink-800">خانه</Link>
            </li>
            <li aria-hidden>›</li>
            <li className="font-bold text-ink-800" aria-current="page">تماس با ما</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-black text-ink-800 md:text-3xl">تماس با ما</h1>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-ink-500">
          کارشناسان ما آمادهٔ پاسخگویی به سؤالات شما دربارهٔ محصولات، خرید عمده و تولید با برند
          اختصاصی هستند.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {CONTACT_CARDS.map(({ icon: Icon, label, value, href }) => {
                const content = (
                  <>
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-500">
                      <Icon className="size-5 text-ink-900" />
                    </span>
                    <span>
                      <span className="block text-xs text-ink-500">{label}</span>
                      <span className="ltr-num mt-1 block text-sm font-bold text-ink-800">{value}</span>
                    </span>
                  </>
                );
                const className =
                  'flex items-start gap-3 rounded-card bg-surface p-5 transition-shadow hover:shadow-card';

                return href ? (
                  <Link key={label} href={href} className={className}>
                    {content}
                  </Link>
                ) : (
                  <div key={label} className={className}>
                    {content}
                  </div>
                );
              })}

              <div className="flex items-start gap-3 rounded-card bg-surface p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-500">
                  <ClockIcon className="size-5 text-ink-900" />
                </span>
                <span>
                  <span className="block text-xs text-ink-500">ساعات پاسخگویی</span>
                  <span className="mt-1 block text-sm font-bold text-ink-800">شنبه تا پنج‌شنبه، ۹ تا ۱۸</span>
                </span>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-base font-bold text-ink-800">مسیرهای سریع‌تر</h2>
              <div className="space-y-3">
                {SHORTCUTS.map(({ icon: Icon, title, body, href }) => (
                  <ButtonLink
                    key={href}
                    href={href}
                    variant="outline"
                    className="h-auto w-full items-start justify-start gap-3 whitespace-normal px-5 py-4 text-start"
                  >
                    <Icon className="mt-0.5 size-5 shrink-0 text-brand-600" />
                    <span>
                      <span className="block text-sm font-bold text-ink-800">{title}</span>
                      <span className="mt-1 block text-xs font-normal text-ink-500">{body}</span>
                    </span>
                  </ButtonLink>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-base font-bold text-ink-800">ارسال پیام مستقیم</h2>
            <ContactMailtoForm />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
